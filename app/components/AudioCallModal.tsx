"use client";

export default function AudioCallModal({
  incoming,
  onAccept,
  onReject,
  inCall,
  onEnd,
}: any) {
  if (!incoming && !inCall) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-80 text-center">
        {!inCall ? (
          <>
            <h2 className="text-lg font-bold mb-4">Incoming Audio Call</h2>
            <div className="flex justify-around">
              <button onClick={onReject} className="bg-red-500 text-white px-4 py-2 rounded">
                Reject
              </button>
              <button onClick={onAccept} className="bg-green-500 text-white px-4 py-2 rounded">
                Accept
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-4">On Call 🎧</h2>
            <button onClick={onEnd} className="bg-red-500 text-white px-6 py-2 rounded">
              End Call
            </button>
          </>
        )}
      </div>
    </div>
  );
}
