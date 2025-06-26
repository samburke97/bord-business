/**
 * Checks and updates the activation status of a location
 * @param locationId The ID of the location to check
 * @returns The activation status and any missing fields
 */
export async function checkActivationStatus(locationId: string): Promise<{
  isActive: boolean;
  missingFields: string[] | null;
}> {
  try {
    const response = await fetch(
      `/api/locations/${locationId}/activation-status`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to check activation status: ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      isActive: data.isActive,
      missingFields: data.missingFields,
    };
  } catch (error) {
    console.error("Error checking location activation status:", error);
    throw error;
  }
}
