# @graphql-hive/core

## 0.13.0

### Minor Changes

- [#6876](https://github.com/graphql-hive/console/pull/6876)
  [`8d56b98`](https://github.com/graphql-hive/console/commit/8d56b9848028d65442cb1dada139f5a17d464f1b)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add helper function `hashOperation` for generating
  consistent hashes used within the Hive Console platform.

## 0.12.0

### Minor Changes

- [#6764](https://github.com/graphql-hive/console/pull/6764)
  [`bbd5643`](https://github.com/graphql-hive/console/commit/bbd5643924eb2b32511e96a03a3a5a978a66adee)
  Thanks [@jdolle](https://github.com/jdolle)! - Track provided operation arguments/inputs and use
  them to determine conditional breaking changes; Fix null to non-null argument breaking change edge
  case"

## 0.11.0

### Minor Changes

- [#6637](https://github.com/graphql-hive/console/pull/6637)
  [`5130fc1`](https://github.com/graphql-hive/console/commit/5130fc1db8c50ac0eb35d901623594749772c550)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add error logging for invalid combinations of the
  `target` and `token` configuration.

  - Please make sure to provide the `target` option for usage reporting when using a token that
    starts with `hvo1/`.
  - Please make sure to **not** provide a `target` option for usage reporting when a token does
    **not** start with `hvo1/`

## 0.10.1

### Patch Changes

- [#6606](https://github.com/graphql-hive/console/pull/6606)
  [`ee70018`](https://github.com/graphql-hive/console/commit/ee7001883970fac81210ec21ce70a72bfd3b67bb)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Client can be used only for experimental
  persisted documents

- [#6623](https://github.com/graphql-hive/console/pull/6623)
  [`a003f78`](https://github.com/graphql-hive/console/commit/a003f781cb1a38d8b00a3256163c50e3893db5f2)
  Thanks [@ardatan](https://github.com/ardatan)! - Use ranged versions in dependencies to prevent
  multiple versions of the same package

## 0.10.0

### Minor Changes

- [#6574](https://github.com/graphql-hive/console/pull/6574)
  [`494697e`](https://github.com/graphql-hive/console/commit/494697e20f67ef877cd5dd63ccd29984c719ab44)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add support for providing a target for usage
  reporting with organization access tokens. This can either be a slug following the format
  `$organizationSlug/$projectSlug/$targetSlug` (e.g `the-guild/graphql-hive/staging`) or an UUID
  (e.g. `a0f4c605-6541-4350-8cfe-b31f21a4bf80`)

  ```ts
  import { createHive } from '@graphql-hive/core'

  const hive = createHive({
    enabled: true,
    token: 'ORGANIZATION_ACCESS_TOKEN',
    usage: {
      target: 'my-org/my-project/my-target'
    }
  })
  ```

## 0.9.1

### Patch Changes

- [#6494](https://github.com/graphql-hive/console/pull/6494)
  [`ae2d16d`](https://github.com/graphql-hive/console/commit/ae2d16d553e264c813ac65d78eacab3d7a2efeae)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Replace usage of `crypto.randomUUID()` with a
  custom UUID generation for better backwards compatability.

## 0.9.0

### Minor Changes

- [#6488](https://github.com/graphql-hive/console/pull/6488)
  [`f7d65fe`](https://github.com/graphql-hive/console/commit/f7d65feb5aaf4f4f86dfc0fe5df3ea4c3df1d7a8)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Include and log a `x-request-id` header for all
  requests sent to the Hive API. This helps users to share more context with Hive staff when
  encountering errors.

## 0.8.4

### Patch Changes

- [#6383](https://github.com/graphql-hive/console/pull/6383)
  [`ec356a7`](https://github.com/graphql-hive/console/commit/ec356a7784d1f59722f80a69f501f1f250b2f6b2)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Collect custom scalars from arguments
  and input object fields

## 0.8.3

### Patch Changes

- [#6118](https://github.com/graphql-hive/console/pull/6118)
  [`039c66b`](https://github.com/graphql-hive/console/commit/039c66bd24d4339e56b4e1e1fc7f8fa68de7e954)
  Thanks [@ardatan](https://github.com/ardatan)! - Remove internal `_testing_` option to replace the
  underlying `fetch` implementation, and add `fetch` option to do the same as part of the public
  API.

## 0.8.2

### Patch Changes

- [#5676](https://github.com/graphql-hive/platform/pull/5676)
  [`c728803`](https://github.com/graphql-hive/platform/commit/c7288038f24c0214b4023994f306c6229c1ce72c)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Correct collection of enum values when
  used in a list

## 0.8.1

### Patch Changes

- [#5667](https://github.com/kamilkisiela/graphql-hive/pull/5667)
  [`be5d39c`](https://github.com/kamilkisiela/graphql-hive/commit/be5d39cbf08d0681d142e83a708d300abc504c44)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Report enum values when an enum is used
  as an output type

## 0.8.0

### Minor Changes

- [#5401](https://github.com/kamilkisiela/graphql-hive/pull/5401)
  [`3ffdb6e`](https://github.com/kamilkisiela/graphql-hive/commit/3ffdb6e9466deb3c3aa09eea1445fc4caf698fd5)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Deduplicate persisted document lookups from the
  registry for reducing the amount of concurrent HTTP requests.

## 0.7.1

### Patch Changes

- [#5367](https://github.com/kamilkisiela/graphql-hive/pull/5367)
  [`a896642`](https://github.com/kamilkisiela/graphql-hive/commit/a896642197e6d7779ba7ed71f365dfbd80532282)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Move createSupergraphSDLFetcher to
  @graphql-hive/core package

## 0.7.0

### Minor Changes

- [#5307](https://github.com/kamilkisiela/graphql-hive/pull/5307)
  [`0a3b24d`](https://github.com/kamilkisiela/graphql-hive/commit/0a3b24d400770c2cc84642959febb9288ad1c1b7)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Re-introduce retry logging removed in previous
  release.

### Patch Changes

- [#5361](https://github.com/kamilkisiela/graphql-hive/pull/5361)
  [`3f03e7b`](https://github.com/kamilkisiela/graphql-hive/commit/3f03e7b3a65707ba8aa04335684f0aa8d261868f)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fixed issue where usage reports were
  sent only on app disposal or max batch size, now also sent at set intervals.

## 0.6.1

### Patch Changes

- [#5304](https://github.com/kamilkisiela/graphql-hive/pull/5304)
  [`f2fef08`](https://github.com/kamilkisiela/graphql-hive/commit/f2fef08e9d1e13cb4a89d3882922db6dc822542e)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fixed a logging issue where both
  initiated requests and successful responses were being recorded. This was causing the logs to be
  filled with unnecessary information and affected `hive artifact:fetch --artifact` command.

## 0.6.0

### Minor Changes

- [#5234](https://github.com/kamilkisiela/graphql-hive/pull/5234)
  [`e6dc5c9`](https://github.com/kamilkisiela/graphql-hive/commit/e6dc5c9df34c30c52555b27b0bca50e0be75480b)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Improved logging output of HTTP requests and
  retires.

## 0.5.0

### Minor Changes

- [#5116](https://github.com/kamilkisiela/graphql-hive/pull/5116)
  [`f1e43c6`](https://github.com/kamilkisiela/graphql-hive/commit/f1e43c641f3ebac931839c7dfbdcb3a885167562)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Added `collectRawUsage` to Hive Client core
  package

## 0.4.0

### Minor Changes

- [#5097](https://github.com/kamilkisiela/graphql-hive/pull/5097)
  [`b8998e7`](https://github.com/kamilkisiela/graphql-hive/commit/b8998e7ead84a2714d13678aaf1e349e648eb90a)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Add retry mechanism to the http client

## 0.3.1

### Patch Changes

- [#4932](https://github.com/kamilkisiela/graphql-hive/pull/4932)
  [`cbc8364`](https://github.com/kamilkisiela/graphql-hive/commit/cbc836488b4acfb618fd877005ecf0126f1706b6)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Prevent failing usage reporting when returning an
  object with additional properties aside from `name` and `version` from the client info
  object/factory function.

## 0.3.0

### Minor Changes

- [#4573](https://github.com/kamilkisiela/graphql-hive/pull/4573)
  [`06d465e`](https://github.com/kamilkisiela/graphql-hive/commit/06d465e882b569b6d0dbd5b271d2d98aafaec0b1)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Moved most of @graphql-hive/client code
  here

- [#4494](https://github.com/kamilkisiela/graphql-hive/pull/4494)
  [`c5eeac5`](https://github.com/kamilkisiela/graphql-hive/commit/c5eeac5ccef9e2dcc3c8bb33deec0fb95af9552e)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - 🚨 BREAKING CHANGE 🚨 Requires now Node
  v16+

## 0.2.4

### Patch Changes

- [#4328](https://github.com/kamilkisiela/graphql-hive/pull/4328)
  [`bb0ff23`](https://github.com/kamilkisiela/graphql-hive/commit/bb0ff238ee7a413aca618b05cdf2187e6b886188)
  Thanks [@Hebilicious](https://github.com/Hebilicious)! - Use node specifier for crypto import

## 0.2.3

### Patch Changes

- [#668](https://github.com/kamilkisiela/graphql-hive/pull/668)
  [`e116841`](https://github.com/kamilkisiela/graphql-hive/commit/e116841a739bfd7f37c4a826544301cf23d61637)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fix ESM/CJS issue

## 0.2.2

### Patch Changes

- ad66973: Bump

## 0.2.1

### Patch Changes

- 0a5dbeb: Point to graphql-hive.com

## 0.2.0

### Minor Changes

- ac9b868c: Support GraphQL v16

## 0.1.0

### Minor Changes

- d7348a3: Hide literals and remove aliases

### Patch Changes

- d7348a3: Pick operation name from DocumentNode

## 0.0.5

### Patch Changes

- c6ef3d2: Bob update

## 0.0.4

### Patch Changes

- 4a7c569: Share operation hashing

## 0.0.3

### Patch Changes

- 6b74355: Fix sorting

## 0.0.2

### Patch Changes

- 094c861: Normalization of operations
