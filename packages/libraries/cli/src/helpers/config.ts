import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const LegacyConfigModel = z.object({
  registry: z.string().optional(),
  token: z.string().optional(),
});

const ConfigModel = z.object({
  registry: z
    .object({
      endpoint: z.string().url().optional(),
      accessToken: z.string().optional(),
    })
    .optional(),
  cdn: z
    .object({
      endpoint: z.string().url().optional(),
      accessToken: z.string().optional(),
    })
    .optional(),
});

export type ConfigModelType = z.TypeOf<typeof ConfigModel>;

type BuildPropertyPath<TObject extends z.ZodObject<any>> = `.${GetConfigurationKeys<TObject>}`;

type GetConfigurationKeys<
  T extends z.ZodObject<{
    [key: string]: z.ZodType<any, any>;
  }>,
> =
  T extends z.ZodObject<infer TObjectShape>
    ? TObjectShape extends Record<infer TKey, infer TObjectPropertyType>
      ? TKey extends string
        ? `${TKey}${TObjectPropertyType extends z.ZodObject<any>
            ? BuildPropertyPath<TObjectPropertyType>
            : TObjectPropertyType extends z.ZodOptional<infer TOptionalInnerObjectPropertyType>
              ? TOptionalInnerObjectPropertyType extends z.ZodObject<any>
                ? BuildPropertyPath<TOptionalInnerObjectPropertyType>
                : ''
              : ''}`
        : never
      : never
    : never;

type GetZodValueType<
  TString extends string,
  ConfigurationModelType extends z.ZodObject<any>,
> = TString extends `${infer TKey}.${infer TNextKey}`
  ? ConfigurationModelType extends z.ZodObject<infer InnerType>
    ? InnerType[TKey] extends z.ZodObject<any>
      ? GetZodValueType<TNextKey, InnerType[TKey]>
      : InnerType[TKey] extends z.ZodOptional<infer OptionalInner>
        ? OptionalInner extends z.ZodObject<any>
          ? GetZodValueType<TNextKey, OptionalInner>
          : never
        : never
    : never
  : ConfigurationModelType extends z.ZodObject<infer InnerType>
    ? z.TypeOf<InnerType[TString]>
    : never;

export type GetConfigurationValueType<TString extends string> = GetZodValueType<
  TString,
  typeof ConfigModel
>;

export type ValidConfigurationKeys = GetConfigurationKeys<typeof ConfigModel>;

export const graphqlEndpoint = 'https://app.graphql-hive.com/graphql';

export class Config {
  private cache?: ConfigModelType;
  private filepath: string;

  constructor({ filepath, rootDir }: { filepath?: string; rootDir: string }) {
    if (filepath) {
      this.filepath = filepath;
    } else {
      this.filepath = path.join(rootDir, 'hive.json');
    }
  }

  get<TKey extends ValidConfigurationKeys>(
    key: TKey,
  ): GetZodValueType<TKey, typeof ConfigModel> | null {
    const map = this.read();

    const parts = key.split('.');
    let current: any = map;
    for (const part of parts) {
      if (current == null) {
        return null;
      }

      current = current[part];
    }

    return current as GetZodValueType<TKey, typeof ConfigModel>;
  }

  private readSpace(content: Record<string, any>) {
    // eslint-disable-next-line no-process-env
    const space = process.env.HIVE_SPACE;

    if (space) {
      return content[space];
    }

    if ('default' in content) {
      return content['default'];
    }

    return content;
  }

  private read() {
    try {
      if (!this.cache) {
        const space: unknown = this.readSpace(JSON.parse(fs.readFileSync(this.filepath, 'utf-8')));

        const legacyConfig = LegacyConfigModel.safeParse(space);
        if (legacyConfig.success) {
          this.cache = {
            registry: {
              endpoint: legacyConfig.data.registry,
              accessToken: legacyConfig.data.token,
            },
            cdn: {
              endpoint: undefined,
              accessToken: undefined,
            },
          };
        }
        const config = ConfigModel.safeParse(space);
        // TODO: we should probably print a warning/error in case of an invalid config.
        if (config.success) {
          this.cache = config.data;
        } else {
          throw new Error('Invalid config.');
        }
      }
    } catch (error) {
      this.cache = {
        registry: {
          endpoint: undefined,
          accessToken: undefined,
        },
        cdn: {
          endpoint: undefined,
          accessToken: undefined,
        },
      };
    }

    return this.cache;
  }
}
