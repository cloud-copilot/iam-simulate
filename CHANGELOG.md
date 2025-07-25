## [0.1.61](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.60...v0.1.61) (2025-07-26)

## [0.1.60](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.59...v0.1.60) (2025-07-19)

## [0.1.59](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.58...v0.1.59) (2025-07-12)

## [0.1.58](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.57...v0.1.58) (2025-07-08)

## [0.1.57](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.56...v0.1.57) (2025-07-01)

## [0.1.56](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.55...v0.1.56) (2025-07-01)

## [0.1.55](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.54...v0.1.55) (2025-07-01)


### Features

* Support evaluating VPC endpoint policies ([98cc9cd](https://github.com/cloud-copilot/iam-simulate/commit/98cc9cdc20c81b95d55a405a33fff168c89ed0cd))

## [0.1.54](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.53...v0.1.54) (2025-06-29)


### Features

* Add policy id to analyses ([68dc2d4](https://github.com/cloud-copilot/iam-simulate/commit/68dc2d4f63543a1e0301ffc62db4c82fecf42cc2))

## [0.1.53](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.52...v0.1.53) (2025-06-28)


### Features

* Indicate of role session name in a deny statement could be ignored ([df3537e](https://github.com/cloud-copilot/iam-simulate/commit/df3537e5607627b5abacc0a9868e79de21f7dbb9))

## [0.1.52](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.51...v0.1.52) (2025-06-22)


### Bug Fixes

* Only show ignored conditions if they are consequential to the simulation ([4c4ce06](https://github.com/cloud-copilot/iam-simulate/commit/4c4ce0644e83e9ebc17c62a5c5320be1815f56af))

## [0.1.51](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.50...v0.1.51) (2025-06-21)

## [0.1.50](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.49...v0.1.50) (2025-06-21)


### Bug Fixes

* Fix handling of IPs without IP Mask for IpAddress and NotIpAddress ([80c3ac1](https://github.com/cloud-copilot/iam-simulate/commit/80c3ac102445da62194ee345a5fdd9c0f04b9a14))


### Features

* Add new discovery mode to simulator ([9c1f67f](https://github.com/cloud-copilot/iam-simulate/commit/9c1f67f90096d304b93156cf10e7a4f9c8de6c4c))

## [0.1.49](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.48...v0.1.49) (2025-06-21)

## [0.1.48](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.47...v0.1.48) (2025-06-20)


### Bug Fixes

* When a condition set operator is used on a context key that has a single value, treat it like a multi value context key. ([d871729](https://github.com/cloud-copilot/iam-simulate/commit/d871729de5505a575a841befc567b5788ce5a25f))

## [0.1.47](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.46...v0.1.47) (2025-06-17)

## [0.1.46](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.45...v0.1.46) (2025-06-14)


### Features

* Deny change actions to AWS managed policies ([b8d74fb](https://github.com/cloud-copilot/iam-simulate/commit/b8d74fb2ec8a24a9f98f9aad3bbce2d5b2bfc3ee))
* Implicitly deny modification of aws reserved roles ([ae280b9](https://github.com/cloud-copilot/iam-simulate/commit/ae280b9a0ed53b2de8fdcf78cf90e4e09a2e9177))

## [0.1.45](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.44...v0.1.45) (2025-06-08)

## [0.1.44](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.43...v0.1.44) (2025-05-31)

## [0.1.43](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.42...v0.1.43) (2025-05-27)

## [0.1.42](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.41...v0.1.42) (2025-05-26)


### Features

* Properly support service principals in resource policies ([02164b9](https://github.com/cloud-copilot/iam-simulate/commit/02164b988a68070da7d4006de8e7c3e8a5977446))
* sts:GetCallerIdentity is always allowed ([be26ed8](https://github.com/cloud-copilot/iam-simulate/commit/be26ed88e51da293e44e2dac721531bbdae6a0b8))

## [0.1.41](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.40...v0.1.41) (2025-05-26)

## [0.1.40](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.39...v0.1.40) (2025-05-25)


### Bug Fixes

* Ignore an empty array of permission boundaries. ([02e557c](https://github.com/cloud-copilot/iam-simulate/commit/02e557cc16b431004e07767d85fc2e18aef423bc))

## [0.1.39](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.38...v0.1.39) (2025-05-25)


### Bug Fixes

* Remove bad node:test import ([7195ffc](https://github.com/cloud-copilot/iam-simulate/commit/7195ffc653ad6bdcd407fa1a44514479fae5404a))

## [0.1.38](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.37...v0.1.38) (2025-05-25)


### Features

* Refactor to use iam-utils package ([71ca650](https://github.com/cloud-copilot/iam-simulate/commit/71ca6500c48d655662ae5cb3700fde532be5faa2))

## [0.1.37](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.36...v0.1.37) (2025-05-24)

## [0.1.36](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.35...v0.1.36) (2025-05-24)

## [0.1.35](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.34...v0.1.35) (2025-05-17)

## [0.1.34](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.33...v0.1.34) (2025-05-10)

## [0.1.33](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.32...v0.1.33) (2025-05-04)

## [0.1.32](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.31...v0.1.32) (2025-04-26)

## [0.1.31](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.30...v0.1.31) (2025-04-19)

## [0.1.30](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.29...v0.1.30) (2025-04-12)

## [0.1.29](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.28...v0.1.29) (2025-04-05)

## [0.1.28](https://github.com/cloud-copilot/iam-simulate/compare/v0.1.27...v0.1.28) (2025-03-01)

# 1.0.0 (2025-02-16)
