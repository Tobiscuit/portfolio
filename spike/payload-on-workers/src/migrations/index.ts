import * as migration_20261020_222712_initial from './20261020_222712_initial';

export const migrations = [
  {
    up: migration_20261020_222712_initial.up,
    down: migration_20261020_222712_initial.down,
    name: '20261020_222712_initial'
  },
];
