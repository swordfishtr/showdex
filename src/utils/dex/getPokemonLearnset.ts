import { type MoveName } from '@smogon/calc';
import { formatId } from '@showdex/utils/core';
import { logger } from '@showdex/utils/debug';

const l = logger('@showdex/utils/dex/getPokemonLearnset()');

/**
 * Returns the legal learnsets of the passed-in `speciesForme`.
 *
 * * Learnsets exist in the `BattleTeambuilderTable` global.
 *   - Should it not be available, an empty array (i.e., `[]`) will be returned.
 * * Better to use this than the `dex.learnsets.learnable()` from `@pkmn/data` since
 *   the learnsets are already loaded into the client, so using `@pkmn/data` is a bit redundant.
 *   - Honestly gave me more trouble using the `dex` from `@pkmn/data` as it required more
 *     edge-casing for certain formats like BDSP and National Dex.
 *   - There exists a `@pkmn/mods`, but installing that would bloat the bundle size, which could
 *     be problematic when trying to submit to some browser extension stores.
 * * Passing `true` for `ignoreGen` will return all legal moves from every gen.
 *
 * @since 1.0.2
 */
export const getPokemonLearnset = (
  format: string,
  speciesForme: string,
  ignoreGen?: boolean,
): MoveName[] => {
  if (!window.GensTeambuilderTable || !format || !speciesForme) {
    return [];
  }

  const gttformat = window.GensTeambuilderTable.formats[format] ?? window.GensTeambuilderTable.formats['gen9nationaldexag'];
  const gttmod = window.GensTeambuilderTable.mods[gttformat.mod];
  const gttdex = window.Dex.mod(gttformat.mod);

  const learnsets: Record<string, string> = {
    ...window.GensTeambuilderTable.learnsets,
    ...(!!gttmod && gttmod.learnsets),
    ...(!!gttformat && gttformat.learnsets),
  };

  // find all the species (including previous evolutions) to lookup learnsets for
  // (e.g., Weavile's prevo is Sneasel, which includes moves that don't exist in Weavile's learnset like Icicle Crash)
  const speciesIdLookups: string[] = [];
  let currentDexSpecies = gttdex.species.get(speciesForme);

  while (currentDexSpecies?.exists) {
    const {
      id,
      baseSpecies,
      battleOnly: battleOnlyFromDex,
      changesFrom,
      prevo,
    } = currentDexSpecies;

    // battleOnly could be 'Charizard' (from 'Charizard-Mega-Y', for instance) or
    // ['Necrozma-Dawn-Wings', 'Necrozma-Dusk-Mane'] (from 'Necrozma-Ultra'), which we'll ignore if that's the case
    const battleOnly = typeof battleOnlyFromDex === 'string'
      ? battleOnlyFromDex
      : null;

    // only push to speciesIdLookups if the formatted id exists in learnsets
    if (id in learnsets) {
      speciesIdLookups.push(id);
    } else if (battleOnly && battleOnly !== baseSpecies && formatId(battleOnly) in learnsets) {
      speciesIdLookups.push(formatId(battleOnly));
    } else if (formatId(baseSpecies) in learnsets) {
      speciesIdLookups.push(formatId(baseSpecies));
    }

    const nextSpecies = battleOnly || changesFrom || prevo;

    currentDexSpecies = nextSpecies
      ? gttdex.species.get(nextSpecies)
      : null;
  }

  if (!speciesIdLookups.length) {
    if (__DEV__) {
      l.warn(
        'Failed to obtain any speciesIdLookups for speciesForme', speciesForme,
        '\n', 'speciesIdLookups', speciesIdLookups,
        '\n', 'format', format, 'gen', gttdex.gen,
        '\n', '(You will only see this warning on development.)',
      );
    }

    return [];
  }

  const learnset: MoveName[] = Array.from(
    new Set(
      speciesIdLookups.flatMap((speciesId) => {
        const learnsetKey = speciesId in learnsets
          ? speciesId // should always be this case, but checking again just in case
          : Object.keys(learnsets).find((k) => speciesId.includes(k));

        if (!learnsetKey) {
          return [];
        }

        // e.g., { attract: '45678pqg', auroraveil: '8g', ... }
        return Object.entries(learnsets[learnsetKey])
          .filter(([, gens]) => ignoreGen || gens.includes(String(gttdex.gen)))
          .map(([id]) => gttdex.moves.get(id)?.name as MoveName)
          .filter(Boolean);
      }),
    ),
  ).sort();

  return learnset;
};
