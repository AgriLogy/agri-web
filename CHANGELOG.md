# [1.8.0](https://github.com/AgriLogy/agrilogy-front/compare/v1.7.0...v1.8.0) (2026-06-07)


### Features

* **sensors:** show battery + signal metrics on the dashboard ([#109](https://github.com/AgriLogy/agrilogy-front/issues/109)) ([0f1ea41](https://github.com/AgriLogy/agrilogy-front/commit/0f1ea41a5f84377ccb58d19833a2507c781c5cd7))

# [1.7.0](https://github.com/AgriLogy/agrilogy-front/compare/v1.6.1...v1.7.0) (2026-06-05)


### Features

* **notifications:** flexible per-zone notification delivery rate ([#107](https://github.com/AgriLogy/agrilogy-front/issues/107)) ([1f61b13](https://github.com/AgriLogy/agrilogy-front/commit/1f61b1398da6d82640ba7727996791d5a9614e49))

## [1.6.1](https://github.com/AgriLogy/agrilogy-front/compare/v1.6.0...v1.6.1) (2026-06-04)


### Bug Fixes

* **i18n:** translate data-driven labels and localize dates (ar/fr/en) ([#103](https://github.com/AgriLogy/agrilogy-front/issues/103)) ([e5d4227](https://github.com/AgriLogy/agrilogy-front/commit/e5d4227982738c0b061aa40aae14fddadb2bbea6))

# [1.6.0](https://github.com/AgriLogy/agrilogy-front/compare/v1.5.0...v1.6.0) (2026-06-04)


### Features

* **i18n:** translate the full dashboard (charts, sensors, data) into ar/fr/en ([#101](https://github.com/AgriLogy/agrilogy-front/issues/101)) ([3671e46](https://github.com/AgriLogy/agrilogy-front/commit/3671e4639db83c2f956f616682cf22d6b17682e9))

# [1.5.0](https://github.com/AgriLogy/agrilogy-front/compare/v1.4.5...v1.5.0) (2026-06-04)


### Features

* **i18n:** add Arabic, French & English localization ([#99](https://github.com/AgriLogy/agrilogy-front/issues/99)) ([b2f5ba3](https://github.com/AgriLogy/agrilogy-front/commit/b2f5ba34f43eb19887cf7f7d1139087327c6c308))

## [1.4.5](https://github.com/AgriLogy/agrilogy-front/compare/v1.4.4...v1.4.5) (2026-06-02)


### Bug Fixes

* **alerts:** drop trailing slash on alert update/delete URLs ([#95](https://github.com/AgriLogy/agrilogy-front/issues/95)) ([fa6cb73](https://github.com/AgriLogy/agrilogy-front/commit/fa6cb7360bdcc476a46dec61722fa95800bdbad5))

## [1.4.4](https://github.com/AgriLogy/agrilogy-front/compare/v1.4.3...v1.4.4) (2026-06-02)


### Bug Fixes

* **meteo:** tidy forecast row (7 cols, short labels, no wrap) ([#93](https://github.com/AgriLogy/agrilogy-front/issues/93)) ([003658a](https://github.com/AgriLogy/agrilogy-front/commit/003658afb6d199a5ec5d51d14fdb41eedb04dd1d))

## [1.4.3](https://github.com/AgriLogy/agrilogy-front/compare/v1.4.2...v1.4.3) (2026-06-02)


### Bug Fixes

* **ui:** unify reading panels to brand-green + meteo forecast fit ([#91](https://github.com/AgriLogy/agrilogy-front/issues/91)) ([0899e53](https://github.com/AgriLogy/agrilogy-front/commit/0899e532d3a01422bd9c57de9392e01ce253a30e))

## [1.4.2](https://github.com/AgriLogy/agrilogy-front/compare/v1.4.1...v1.4.2) (2026-06-02)


### Bug Fixes

* **dashboard:** match other pages' full-width layout ([#89](https://github.com/AgriLogy/agrilogy-front/issues/89)) ([ce807c9](https://github.com/AgriLogy/agrilogy-front/commit/ce807c9cb73172874697aa4e2268a0a60769580a)), closes [#75](https://github.com/AgriLogy/agrilogy-front/issues/75)

## [1.4.1](https://github.com/AgriLogy/agrilogy-front/compare/v1.4.0...v1.4.1) (2026-06-02)


### Bug Fixes

* **charts:** horizontal-only gridlines ([#87](https://github.com/AgriLogy/agrilogy-front/issues/87)) ([a99ee63](https://github.com/AgriLogy/agrilogy-front/commit/a99ee63900603ae02fe3eaa88d50ace8a1d41c99))

# [1.4.0](https://github.com/AgriLogy/agrilogy-front/compare/v1.3.8...v1.4.0) (2026-06-02)


### Bug Fixes

* **dashboard:** cap content max-width at 1400px and center ([#75](https://github.com/AgriLogy/agrilogy-front/issues/75)) ([d92deec](https://github.com/AgriLogy/agrilogy-front/commit/d92deec876325e5bbc46249204bce046d8039ead)), closes [#74](https://github.com/AgriLogy/agrilogy-front/issues/74)
* **sensors:** rename water_flow label to 'Irrigation' ([#77](https://github.com/AgriLogy/agrilogy-front/issues/77)) ([6ecc66e](https://github.com/AgriLogy/agrilogy-front/commit/6ecc66e6241adfa1d8e2aa9f32f47429d0b0d3b1))
* **wind:** drop dead /sensors/windgust fetch (404 spam) ([#85](https://github.com/AgriLogy/agrilogy-front/issues/85)) ([33ba144](https://github.com/AgriLogy/agrilogy-front/commit/33ba144d55feb21d7aeba027487ed494137e5171)), closes [#6](https://github.com/AgriLogy/agrilogy-front/issues/6)


### Features

* **et0:** show daily total, previous-day & cumulative ET₀ ([#79](https://github.com/AgriLogy/agrilogy-front/issues/79)) ([d8ddbbc](https://github.com/AgriLogy/agrilogy-front/commit/d8ddbbcde67978dd3b949c9ddd658bd706b6224a)), closes [#78](https://github.com/AgriLogy/agrilogy-front/issues/78) [#78](https://github.com/AgriLogy/agrilogy-front/issues/78) [#78](https://github.com/AgriLogy/agrilogy-front/issues/78)
* **weather:** add point de rosée (dew point) line ([#81](https://github.com/AgriLogy/agrilogy-front/issues/81)) ([d61e3b8](https://github.com/AgriLogy/agrilogy-front/commit/d61e3b802f670d395cc4f7cbe90902f708cb329d)), closes [#80](https://github.com/AgriLogy/agrilogy-front/issues/80)

## [1.3.8](https://github.com/AgriLogy/agrilogy-front/compare/v1.3.7...v1.3.8) (2026-06-02)


### Bug Fixes

* **api:** default API base to back.agrogo-datafarm.com ([#73](https://github.com/AgriLogy/agrilogy-front/issues/73)) ([e24229f](https://github.com/AgriLogy/agrilogy-front/commit/e24229f146403c8c606c20460d18750d47d6b909)), closes [#72](https://github.com/AgriLogy/agrilogy-front/issues/72)

## [1.3.7](https://github.com/AgriLogy/agrilogy-front/compare/v1.3.6...v1.3.7) (2026-05-29)

## [1.3.6](https://github.com/AgriLogy/agrilogy-front/compare/v1.3.5...v1.3.6) (2026-05-29)

## [1.3.5](https://github.com/AgriLogy/agrilogy-front/compare/v1.3.4...v1.3.5) (2026-05-28)

## [1.3.4](https://github.com/AgriLogy/agrilogy-front/compare/v1.3.3...v1.3.4) (2026-05-22)


### Bug Fixes

* **charts:** make soil moisture + temperature charts usable ([#66](https://github.com/AgriLogy/agrilogy-front/issues/66)) ([f7110d5](https://github.com/AgriLogy/agrilogy-front/commit/f7110d528e91b4683ba3673363a2d213d047187f))

## [1.3.3](https://github.com/AgriLogy/agrilogy-front/compare/v1.3.2...v1.3.3) (2026-05-21)


### Bug Fixes

* **notifications:** make units visible in card view (°C, %, L) ([#63](https://github.com/AgriLogy/agrilogy-front/issues/63)) ([3d9543e](https://github.com/AgriLogy/agrilogy-front/commit/3d9543e0e1a756362bfc64e0f3804c05a0e007b3))

## [1.3.2](https://github.com/AgriLogy/agrilogy-front/compare/v1.3.1...v1.3.2) (2026-05-21)

## [1.3.1](https://github.com/AgriLogy/agrilogy-front/compare/v1.3.0...v1.3.1) (2026-05-20)


### Bug Fixes

* **et0:** chart renders calculated series when sensor leg is empty ([#59](https://github.com/AgriLogy/agrilogy-front/issues/59)) ([dc22869](https://github.com/AgriLogy/agrilogy-front/commit/dc22869dd3597a61e3c86d07d5879f6edb278a18))

# [1.3.0](https://github.com/AgriLogy/agrilogy-front/compare/v1.2.3...v1.3.0) (2026-05-16)


### Bug Fixes

* deployement errrors ([e14a29a](https://github.com/AgriLogy/agrilogy-front/commit/e14a29afb0197c763df0c5b74494935ece20b592))
* Dockerfile ([bad8a84](https://github.com/AgriLogy/agrilogy-front/commit/bad8a84ac2e8a18a82ecc8ad0ce2e9c430e19308))
* **lint:** drop unused ChatProvider import in providers.tsx ([de94cc0](https://github.com/AgriLogy/agrilogy-front/commit/de94cc0c7ac23b1d91c49a1bd3f2e65baba086a5))
* navbar and notification error fixed ([c13fea9](https://github.com/AgriLogy/agrilogy-front/commit/c13fea92c685ff4108724d0f796c0a1fb9dafe87))


### Features

* add agrilogy chat bot ([#21](https://github.com/AgriLogy/agrilogy-front/issues/21)) ([2bd3dc2](https://github.com/AgriLogy/agrilogy-front/commit/2bd3dc23141e28059d5219d57707d94ada65e1be))

## [1.2.3](https://github.com/AgriLogy/agrilogy-front/compare/v1.2.2...v1.2.3) (2026-05-16)

## [1.2.2](https://github.com/AgriLogy/agrilogy-front/compare/v1.2.1...v1.2.2) (2026-05-16)

## [1.2.1](https://github.com/AgriLogy/agrilogy-front/compare/v1.2.0...v1.2.1) (2026-05-14)


### Bug Fixes

* **login:** show error on wrong password, expose logout in account menu ([#54](https://github.com/AgriLogy/agrilogy-front/issues/54)) ([c06af56](https://github.com/AgriLogy/agrilogy-front/commit/c06af56d00e764ca6d7cb50f07dffe06f79a4b76)), closes [#53](https://github.com/AgriLogy/agrilogy-front/issues/53)

# [1.2.0](https://github.com/AgriLogy/agrilogy-front/compare/v1.1.1...v1.2.0) (2026-05-14)


### Features

* UI harmonization ([#52](https://github.com/AgriLogy/agrilogy-front/issues/52)) ([eb484cb](https://github.com/AgriLogy/agrilogy-front/commit/eb484cb7830ce4fb3b4cd9dbdf4906a96f26a2b7)), closes [fff/#ccc](https://github.com/AgriLogy/agrilogy-front/issues/ccc) [#44](https://github.com/AgriLogy/agrilogy-front/issues/44)

## [1.1.1](https://github.com/AgriLogy/agrilogy-front/compare/v1.1.0...v1.1.1) (2026-05-12)


### Bug Fixes

* **et0:** align frontend with hourly ET0 backend ([#38](https://github.com/AgriLogy/agrilogy-front/issues/38)) ([b17e677](https://github.com/AgriLogy/agrilogy-front/commit/b17e6770faabea302da0837dd810d54974ba82a1))

# [1.1.0](https://github.com/AgriLogy/agrilogy-front/compare/v1.0.1...v1.1.0) (2026-05-11)


### Features

* **alerts:** plug-and-play alert workflow with antd UI + jest behavi… ([#35](https://github.com/AgriLogy/agrilogy-front/issues/35)) ([fdb36b9](https://github.com/AgriLogy/agrilogy-front/commit/fdb36b9bf057dc9a21241e5635167f13e0660973))

## [1.0.1](https://github.com/AgriLogy/agrilogy-front/compare/v1.0.0...v1.0.1) (2026-05-07)

# 1.0.0 (2026-05-06)


### Bug Fixes

* **ci:** declare image module types so typecheck works ([#29](https://github.com/mks-zakaria/agrilogy-front/issues/29)) ([8b423d0](https://github.com/mks-zakaria/agrilogy-front/commit/8b423d056606f0d674b6a99d41c6780ced8d9681))
* **ci:** skip husky hooks during semantic-release ([57d393f](https://github.com/mks-zakaria/agrilogy-front/commit/57d393fb20a709ba227efec11087fb11655ba28d))
* fixed some responsivness errors ([df46103](https://github.com/mks-zakaria/agrilogy-front/commit/df46103481fbf3761b18837728f3a77746571927))
* navbar and notification error fixed ([c666bdd](https://github.com/mks-zakaria/agrilogy-front/commit/c666bddb024bebb05a3ae86abba7361a1690b445))
* rectified the timestamp error ([1f1eaf5](https://github.com/mks-zakaria/agrilogy-front/commit/1f1eaf58cdaa6583ca25420dde9d8fc484b5afdf))
* trigger first release ([8defcaa](https://github.com/mks-zakaria/agrilogy-front/commit/8defcaabfe9cf3c41356eb64ddf18a854b9b1704))


### Features

* add unified tooltip ([#8](https://github.com/mks-zakaria/agrilogy-front/issues/8)) ([0ffb972](https://github.com/mks-zakaria/agrilogy-front/commit/0ffb9722d177ab8c85b9c4899957f5e2c75a7a70))
* **docker:** separate frontend deployment branch ([a348145](https://github.com/mks-zakaria/agrilogy-front/commit/a34814516a1def60d93799d2fe3a07c1b694b419))
* **front:** switching to https ([a1449a3](https://github.com/mks-zakaria/agrilogy-front/commit/a1449a3adca0d4509fe897b70af2339f0dc57a42))
* implement notification engine v1 and enhance UI components ([d7049dd](https://github.com/mks-zakaria/agrilogy-front/commit/d7049dda791fd7906fd9645b6025b65313af620d))
* integrate Mapbox GL Draw and enhance grid responsiveness ([a8e65fe](https://github.com/mks-zakaria/agrilogy-front/commit/a8e65fe485dbcf38cef9ba7ba745715e2d107514))
* **irrigation:** 15-min sensor simulator + hourly ET₀/VPD + Celery beat ([2ecc575](https://github.com/mks-zakaria/agrilogy-front/commit/2ecc575eed2532402f9b092329460b20b31e1e3f))
