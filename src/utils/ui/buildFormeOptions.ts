import { type DropdownOption } from '@showdex/components/form';
import { type CalcdexPokemon, type CalcdexPokemonUsageAlt } from '@showdex/interfaces/calc';
// import { logger } from '@showdex/utils/debug';
import { type CalcdexPokemonUsageAltSorter } from '@showdex/utils/presets';

export type CalcdexPokemonFormeOption = DropdownOption<string>;

// const l = logger('@showdex/utils/ui/buildFormeOptions()');

/**
 * Builds the `options[]` prop for the species forme `Dropdown` in `PokeInfo`.
 *
 * @since 1.2.0
 */
export const buildFormeOptions = (
  format: string,
  config?: {
    speciesForme?: CalcdexPokemon['speciesForme'];
    altFormes?: CalcdexPokemon['altFormes'];
    transformedForme?: CalcdexPokemon['transformedForme'];
    usageAlts?: CalcdexPokemonUsageAlt<string>[];
    usageFinder?: (value: string) => string;
    usageSorter?: CalcdexPokemonUsageAltSorter<string>;
    translate?: (value: string) => string;
    translateHeader?: (value: string) => string;
  },
): CalcdexPokemonFormeOption[] => {
  const options: CalcdexPokemonFormeOption[] = [];

  if (!format || !config?.speciesForme || !window.GensTeambuilderTable) {
    return options;
  }

  // Generations doesn't keep track of Smogon tiers, and likewise for usage stats currently.
  // So this part doesn't need to be complicated. We'll show every forme.

  const gttformat = window.GensTeambuilderTable.formats[format] ?? window.GensTeambuilderTable.formats['gen9nationaldexag'];
  const gttdex = window.Dex.mod(gttformat.mod);

  if(!gttdex) {
    return options;
  }

  const species = gttdex.species.get(config.speciesForme);

  if(!species.exists) {
    return options;
  }

  const baseSpecies = gttdex.species.get(species.baseSpecies);

  if(!baseSpecies.otherFormes) {
    return options;
  }

  const formes = [ baseSpecies.baseSpecies, ...baseSpecies.otherFormes ];

  options.push({
    label: config.translateHeader('Formes'),
    options: formes.map((forme) => ({
      label: config.translate(forme),
      value: forme,
    })),
  });

  return options;
};
