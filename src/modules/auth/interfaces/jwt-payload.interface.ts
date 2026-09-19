export interface JwtPayload {
  id: string;
  email: string;
  isAdmin: boolean;
  role: string;
  restaurantId: string | null;
  /** Set only on tokens minted by a SUPER_ADMIN's "impersonate restaurant" action. */
  impersonatedRestaurantId?: string | null;
}
