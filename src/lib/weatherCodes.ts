const weatherLabels = new Map<number, string>([
  [0, 'Céu limpo'],
  [1, 'Predominantemente limpo'],
  [2, 'Parcialmente nublado'],
  [3, 'Encoberto'],
  [45, 'Nevoeiro'],
  [48, 'Nevoeiro com deposição de geada'],
  [51, 'Garoa leve'],
  [53, 'Garoa moderada'],
  [55, 'Garoa intensa'],
  [56, 'Garoa congelante leve'],
  [57, 'Garoa congelante intensa'],
  [61, 'Chuva leve'],
  [63, 'Chuva moderada'],
  [65, 'Chuva forte'],
  [66, 'Chuva congelante leve'],
  [67, 'Chuva congelante forte'],
  [71, 'Neve leve'],
  [73, 'Neve moderada'],
  [75, 'Neve forte'],
  [77, 'Grãos de neve'],
  [80, 'Pancadas de chuva leves'],
  [81, 'Pancadas de chuva moderadas'],
  [82, 'Pancadas de chuva violentas'],
  [85, 'Pancadas de neve leves'],
  [86, 'Pancadas de neve fortes'],
  [95, 'Trovoada leve ou moderada'],
  [96, 'Trovoada com granizo leve'],
  [99, 'Trovoada com granizo forte'],
]);

export function getWeatherLabel(code?: number): string {
  return (code === undefined ? undefined : weatherLabels.get(code)) ?? 'Condição indisponível';
}
