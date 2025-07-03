// app/api/auth/check-username/route.ts (FIXED)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Common profanity words to block (you can expand this list)
const PROFANITY_WORDS = [
  // Basic profanity
  "fuck",
  "shit",
  "bitch",
  "damn",
  "ass",
  "bastard",
  "crap",
  "piss",
  "cock",
  "dick",
  "pussy",
  "tits",
  "boob",
  "sex",
  "porn",
  "nude",
  "whore",
  "slut",
  "fag",
  "gay",
  "lesbian",
  "homo",
  "retard",
  "nigger",
  "chink",
  "spic",
  "kike",
  "wetback",
  "towelhead",

  // Variations and leetspeak
  "f*ck",
  "sh*t",
  "b*tch",
  "a$$",
  "a55",
  "b1tch",
  "fuk",
  "sht",
  "btch",
  "fck",
  "fxck",
  "shxt",
  "shiit",
  "shitt",
  "fcuk",
  "phuck",

  // Other inappropriate terms
  "hitler",
  "nazi",
  "kkk",
  "isis",
  "terrorist",
  "bomb",
  "kill",
  "murder",
  "rape",
  "molest",
  "pedophile",
  "pedo",
  "child",

  // Common spam/inappropriate usernames
  "admin",
  "root",
  "administrator",
  "moderator",
  "mod",
  "support",
  "help",
  "service",
  "official",
  "staff",
  "team",
  "bot",
  "system",
  "null",
  "undefined",
  "anonymous",
  "guest",
  "user",
  "test",
  "demo",
];

function containsProfanity(username: string): boolean {
  const lowerUsername = username.toLowerCase();

  // Check for exact matches and partial matches
  return PROFANITY_WORDS.some((word) => {
    // Check if the profanity word is contained in the username
    return lowerUsername.includes(word.toLowerCase());
  });
}

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { message: "Username is required" },
        { status: 400 }
      );
    }

    // Validate username format
    if (username.length < 3) {
      return NextResponse.json(
        { available: false, message: "Username must be at least 3 characters" },
        { status: 200 }
      );
    }

    if (username.length > 30) {
      return NextResponse.json(
        {
          available: false,
          message: "Username must be less than 30 characters",
        },
        { status: 200 }
      );
    }

    // FIXED: Allow letters, numbers, underscores, periods, and hyphens
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return NextResponse.json(
        {
          available: false,
          message:
            "Username can only contain letters, numbers, periods, underscores, and hyphens",
        },
        { status: 200 }
      );
    }

    // Check for profanity
    if (containsProfanity(username)) {
      return NextResponse.json(
        {
          available: false,
          message: "Username contains inappropriate content",
        },
        { status: 200 }
      );
    }

    // Don't allow usernames that start or end with periods or hyphens
    if (/^[.-]|[.-]$/.test(username)) {
      return NextResponse.json(
        {
          available: false,
          message: "Username cannot start or end with a period or hyphen",
        },
        { status: 200 }
      );
    }

    // Don't allow consecutive periods or hyphens
    if (/[.-]{2,}/.test(username)) {
      return NextResponse.json(
        {
          available: false,
          message: "Username cannot have consecutive periods or hyphens",
        },
        { status: 200 }
      );
    }

    // FIXED: Check if username exists in database (check the correct field)
    const existingUser = await prisma.user.findFirst({
      where: {
        username: username, // Check the username field, not name
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { available: false, message: "Username is already taken" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { available: true, message: "Username is available" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Username check error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
