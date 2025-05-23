import { createHash } from 'node:crypto';
import stringify from 'fast-json-stable-stringify';
import type { Redis } from 'ioredis';
import { TimeoutError } from 'p-timeout';
import type { ServiceLogger } from '@hive/service-common';
import { compositionCacheValueSizeBytes, schemaCompositionCounter } from './metrics';

function createChecksum<TInput>(input: TInput): string {
  return createHash('sha256').update(stringify(input)).digest('hex');
}

type CacheTTLType = 'long' | 'short';

export function createCache(options: {
  redis: Redis;
  logger: Pick<ServiceLogger, 'debug' | 'warn'>;
  /**
   * Prefix for all keys stored in Redis
   */
  prefix: string;
  /**
   * How often to poll Redis for updates
   */
  pollIntervalMs: number;
  /**
   * How long to wait for an action to complete
   */
  timeoutMs: number;
  /**
   * How long to keep the result of an action in Redis
   */
  ttlMs: {
    /**
     * How long to keep a successful action in Redis
     */
    success: number;
    /**
     * How long to keep a failed action in Redis
     */
    failure: number;
  };
}) {
  const { prefix, redis, logger, pollIntervalMs, timeoutMs } = options;

  if (options.ttlMs.failure < timeoutMs) {
    // Actions will expire before they finish (when timeoutMs is reached)
    logger.warn(
      'TTL (failure) is less than timeout, this will cause issues. (ttlMs=%s, timeoutMs=%s)',
      options.ttlMs.failure,
      timeoutMs,
    );

    options.ttlMs.failure = timeoutMs;
  }

  if (options.ttlMs.success < timeoutMs) {
    // Actions will expire before they finish (when timeoutMs is reached)
    logger.warn(
      'TTL (success) is less than timeout, this will cause issues. (ttlMs=%s, timeoutMs=%s)',
      options.ttlMs.success,
      timeoutMs,
    );

    options.ttlMs.success = timeoutMs;
  }

  const ttlMs = options.ttlMs;

  async function readAction<T>(id: string): Promise<State<T> | null> {
    const action = await redis.get(id);

    if (action) {
      return JSON.parse(action);
    }

    return null;
  }

  async function startAction(id: string) {
    logger.debug('Starting action (id=%s)', id);
    // Set and lock + expire
    const inserted = await redis.setnx(id, JSON.stringify({ status: 'started' }));

    if (inserted) {
      logger.debug('Started action (id=%s)', id);
      await redis.pexpire(id, ttlMs.success);
      return {
        status: 'started',
      } as const;
    }

    logger.debug('Reusing action (id=%s)', id);
    return {
      status: 'reusing',
    } as const;
  }

  async function completeAction<T>(
    id: string,
    data: T,
    pickCacheType: (data: T) => CacheTTLType,
  ): Promise<void> {
    logger.debug('Completing action (id=%s)', id);
    const encodedData = JSON.stringify({
      status: 'completed',
      result: data,
    });

    const sizeInBytes = Buffer.byteLength(encodedData, 'utf8');
    compositionCacheValueSizeBytes.observe(sizeInBytes);

    await redis.psetex(
      id,
      pickCacheType(data) === 'long' ? ttlMs.success : ttlMs.failure,
      encodedData,
    );
  }

  async function failAction(id: string, reason: string): Promise<void> {
    logger.debug('Failing action (id=%s, reason=%s)', id, reason);
    await redis.psetex(
      id,
      ttlMs.failure,
      JSON.stringify({
        status: 'failed',
        error: reason,
      }),
    );
  }

  async function runAction<I, O>(
    groupKey: string,
    factory: (input: I, signal: AbortSignal) => Promise<O>,
    pickCacheType: (output: O) => CacheTTLType,
    input: I,
    attempt: number,
  ): Promise<O> {
    const id = `${prefix}:${groupKey}:${createChecksum(input)}`;
    if (attempt === 3) {
      logger.debug('Too many attempts (id=%s)', id);
      throw new Error('Too many attempts');
    }

    const start = await startAction(id);

    if (start.status === 'reusing') {
      let cached = await readAction<O>(id);

      const startedAt = Date.now();
      while (cached && cached.status === 'started') {
        logger.debug('Waiting for action to complete (id=%s, time=%s)', id, Date.now() - startedAt);
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        cached = await readAction<O>(id);
      }

      if (cached) {
        if (cached.status === 'failed') {
          logger.debug('Rejecting action from cache (id=%s)', id);
          if (cached.error.startsWith('TimeoutError:')) {
            schemaCompositionCounter.inc({
              cache: 'hit',
              type: 'timeout',
            });
            throw new TimeoutError(cached.error.replace('TimeoutError:', ''));
          }
          schemaCompositionCounter.inc({
            cache: 'hit',
            type: 'failure',
          });
          throw new Error(cached.error);
        }

        logger.debug('Resolving action from cache (id=%s)', id);
        schemaCompositionCounter.inc({
          cache: 'hit',
          type: 'success',
        });
        return cached.result;
      }

      logger.debug('Cache expired, re-running action (id=%s, attempt=%s)', id, ++attempt);
      return runAction(groupKey, factory, pickCacheType, input, attempt);
    }

    try {
      logger.debug('Executing action (id=%s)', id);
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const result = await Promise.race([
        factory(input, timeoutSignal),
        new Promise<never>((_, reject) => {
          timeoutSignal.addEventListener('abort', () => {
            reject(new TimeoutError(`Timeout: took longer than ${timeoutMs}ms to complete`));
          });
        }),
      ]);

      await completeAction(id, result, pickCacheType);
      schemaCompositionCounter.inc({
        cache: 'miss',
        type: 'success',
      });
      return result;
    } catch (error) {
      schemaCompositionCounter.inc({
        cache: 'miss',
        type: error instanceof TimeoutError ? 'timeout' : 'failure',
      });
      await failAction(id, String(error));
      throw error;
    }
  }

  return {
    timeoutMs,
    isTimeoutError(error: unknown): error is TimeoutError {
      return error instanceof TimeoutError;
    },
    reuse<I, O>(
      groupKey: string,
      factory: (input: I, signal: AbortSignal) => Promise<O>,
      pickCacheType: (output: O) => CacheTTLType = () => 'long',
    ): (input: I) => Promise<O> {
      return async input => runAction(groupKey, factory, pickCacheType, input, 1);
    },
  };
}

export type Cache = ReturnType<typeof createCache>;

type State<T> =
  | {
      status: 'started';
    }
  | {
      status: 'completed';
      result: T;
    }
  | {
      status: 'failed';
      error: string;
    };
