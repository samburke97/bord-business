import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SocialLink {
  platform: string;
  url: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { phone, email, website, socials } = await request.json();

    // Update center contact information
    const updatedCenter = await prisma.center.update({
      where: { id },
      data: {
        phone,
        email,
      },
    });

    // Handle website link
    if (website) {
      // Check if a website link already exists
      const existingWebsiteLink = await prisma.centerLink.findFirst({
        where: {
          centerId: id,
          type: "website",
        },
      });

      if (existingWebsiteLink) {
        // Update existing website link
        await prisma.centerLink.update({
          where: { id: existingWebsiteLink.id },
          data: { url: website },
        });
      } else {
        // Create new website link
        await prisma.centerLink.create({
          data: {
            centerId: id,
            type: "website",
            url: website,
          },
        });
      }
    }

    // Handle social media links
    if (socials && socials.length > 0) {
      // Get existing socials
      const existingSocials = await prisma.centerSocial.findMany({
        where: { centerId: id },
      });

      // Process each social media platform
      for (const social of socials as SocialLink[]) {
        const existingSocial = existingSocials.find(
          (s) => s.platform?.toLowerCase() === social.platform.toLowerCase()
        );

        if (existingSocial) {
          // Update existing social
          await prisma.centerSocial.update({
            where: { id: existingSocial.id },
            data: {
              url: social.url,
            },
          });
        } else {
          // Create new social
          await prisma.centerSocial.create({
            data: {
              centerId: id,
              platform: social.platform,
              url: social.url,
            },
          });
        }
      }

      // Remove any socials that aren't in the new list
      const platformsToKeep = (socials as SocialLink[]).map((s) =>
        s.platform.toLowerCase()
      );
      for (const existingSocial of existingSocials) {
        if (
          existingSocial.platform &&
          !platformsToKeep.includes(existingSocial.platform.toLowerCase())
        ) {
          await prisma.centerSocial.delete({
            where: { id: existingSocial.id },
          });
        }
      }
    } else {
      // If no socials provided, delete all existing socials
      await prisma.centerSocial.deleteMany({
        where: { centerId: id },
      });
    }

    return NextResponse.json(
      { message: "Contact information updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating contact information:", error);
    return NextResponse.json(
      { error: "Failed to update contact information" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
