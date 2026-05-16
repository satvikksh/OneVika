import mongoose from "mongoose";

import User from "../models/User";
import { dbConnect, getNativeDb } from "./mongodb";

const { ObjectId } = mongoose.Types;

export const AI_ASSISTANT_EMAIL = (
  process.env.AI_ASSISTANT_EMAIL || "deepseek-assistant@orbitbyte.ai"
).toLowerCase();
export const AI_ASSISTANT_NAME =
  process.env.AI_ASSISTANT_NAME || "Orbit AI";
export const AI_ASSISTANT_AVATAR =
  process.env.AI_ASSISTANT_AVATAR || "/icons/deepseek-ai.svg";

type AiConversationDoc = {
  _id: mongoose.Types.ObjectId;
  participants?: mongoose.Types.ObjectId[];
  isAI?: boolean;
  aiAssistantUserId?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export async function ensureAiAssistantUser() {
  await dbConnect();

  return User.findOneAndUpdate(
    { email: AI_ASSISTANT_EMAIL },
    {
      $set: {
        name: AI_ASSISTANT_NAME,
        avatar: AI_ASSISTANT_AVATAR,
        image: AI_ASSISTANT_AVATAR,
        isAI: true,
      },
      $setOnInsert: {
        email: AI_ASSISTANT_EMAIL,
        provider: "credentials",
        sessionVersion: 0,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

export async function ensureAiConversationForUser(userId: string) {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user id for AI conversation");
  }

  const assistant = await ensureAiAssistantUser();
  if (!assistant?._id) {
    throw new Error("Unable to initialize AI assistant user");
  }

  const db = await getNativeDb();
  const currentUserId = new ObjectId(userId);
  const assistantUserId = new ObjectId(assistant._id.toString());

  let conversation = await db.collection<AiConversationDoc>("conversations").findOne({
    participants: {
      $all: [currentUserId, assistantUserId],
      $size: 2,
    },
  });

  if (!conversation) {
    const now = new Date();
    const result = await db.collection("conversations").insertOne({
      participants: [currentUserId, assistantUserId],
      isAI: true,
      aiAssistantUserId: assistantUserId,
      createdAt: now,
      updatedAt: now,
    });

    conversation = {
      _id: result.insertedId,
      participants: [currentUserId, assistantUserId],
      isAI: true,
      aiAssistantUserId: assistantUserId,
      createdAt: now,
      updatedAt: now,
    };
  } else if (!conversation.isAI) {
    await db.collection("conversations").updateOne(
      { _id: conversation._id },
      {
        $set: {
          isAI: true,
          aiAssistantUserId: assistantUserId,
        },
      }
    );

    conversation = {
      ...conversation,
      isAI: true,
      aiAssistantUserId: assistantUserId,
    };
  }

  return {
    assistant,
    conversation,
  };
}
