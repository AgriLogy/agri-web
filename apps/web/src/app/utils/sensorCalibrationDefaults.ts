/**
 * Valeurs par défaut du modèle linéaire (PDF §3 PARAMETERAGE) :
 * Valeur réelle = (Valeur brute) × Facteur d’échelle (a) + Décalage (b).
 *
 * Référence : `change.the.unite.of.sensors.from.paramtere.user.1.3.pdf`
 * Tant qu’aucune fiche fabricant n’impose a,b : ici on laisse 1 et 0.
 */
export const SENSOR_CALIBRATION_DEFAULTS: Record<
  string,
  { scaleA: number; offsetB: number }
> = {
  // Exemple : si le PDF indiquait une conversion fabricant, on fixerait par clé :
  // solar_radiation: { scaleA: 1, offsetB: 0 },
};

export function getDefaultCalibrationForSensorKey(key: string): {
  scaleA: number;
  offsetB: number;
} {
  return SENSOR_CALIBRATION_DEFAULTS[key] ?? { scaleA: 1, offsetB: 0 };
}
