const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
const SIXTY_DAYS_SECONDS = 60 * 24 * 60 * 60;
let retentionIndexesReady = null;
async function dropIndexIfExists(collection, indexName) {
    try {
        await collection.dropIndex(indexName);
    }
    catch (error) {
        const mongoError = error;
        if (mongoError?.codeName !== "IndexNotFound" && mongoError?.code !== 27) {
            throw error;
        }
    }
}
export async function ensureRetentionIndexes(db) {
    if (retentionIndexesReady) {
        return retentionIndexesReady;
    }
    retentionIndexesReady = (async () => {
        await Promise.all([
            db.collection("calls").createIndex({ createdAt: 1 }, { expireAfterSeconds: SEVEN_DAYS_SECONDS, name: "ttl_calls_createdAt_7d" }),
            db.collection("notifications").createIndex({ createdAt: 1 }, { expireAfterSeconds: SEVEN_DAYS_SECONDS, name: "ttl_notifications_createdAt_7d" }),
            db.collection("polishedChatUsage").createIndex({ createdAt: 1 }, { expireAfterSeconds: SEVEN_DAYS_SECONDS, name: "ttl_polished_usage_createdAt_7d" }),
            db.collection("polishedChatUsageEvents").createIndex({ createdAt: 1 }, { expireAfterSeconds: SEVEN_DAYS_SECONDS, name: "ttl_polished_usage_events_createdAt_7d" }),
            db.collection("messages").createIndex({ createdAt: 1 }, { expireAfterSeconds: SIXTY_DAYS_SECONDS, name: "ttl_messages_createdAt_60d" }),
            db.collection("notifications").createIndex({ userId: 1, callId: 1, type: 1 }, {
                unique: true,
                sparse: true,
                name: "uniq_missed_call_notification_per_user",
                partialFilterExpression: { type: "call", callId: { $exists: true } },
            }),
        ]);
        const otpChallenges = db.collection("otpchallenges");
        await dropIndexIfExists(otpChallenges, "expiresAt_1");
        await otpChallenges.createIndex({ createdAt: 1 }, { expireAfterSeconds: SEVEN_DAYS_SECONDS, name: "ttl_otp_challenges_createdAt_7d" });
    })().catch((error) => {
        retentionIndexesReady = null;
        throw error;
    });
    return retentionIndexesReady;
}
