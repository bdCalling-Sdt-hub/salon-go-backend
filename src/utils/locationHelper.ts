export function calculateDistance(
  coords1: [number, number],
  coords2: [number, number],
): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

  const [lon1, lat1] = coords1; // [longitude, latitude]
  const [lon2, lat2] = coords2;

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return Number(distance.toFixed(2));
}

export const LocationHelper = {
  calculateDistance,
};
