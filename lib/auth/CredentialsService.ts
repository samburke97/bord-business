import prisma from "@/lib/prisma";
import {
  verifyPassword,
  checkAccountLockout,
  recordFailedAttempt,
  resetFailedAttempts,
} from "@/lib/security/password";

export class CredentialsService {
  static async authenticate(email: string, password: string) {
    if (!email || !password) return null;

    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { credentials: true },
      });

      if (!user?.credentials) return null;

      // Check account lockout
      const lockoutCheck = await checkAccountLockout(user.id);
      if (lockoutCheck.locked) return null;

      // Verify password
      const isValidPassword = await verifyPassword(
        password,
        user.credentials.passwordHash
      );

      if (!isValidPassword) {
        await recordFailedAttempt(user.id);
        return null;
      }

      await resetFailedAttempts(user.id);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        globalRole: user.globalRole,
        isVerified: user.isVerified,
        isActive: user.isActive,
        status: user.status,
      };
    } catch (error) {
      return null;
    }
  }
}
