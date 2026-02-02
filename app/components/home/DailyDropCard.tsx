"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { moodPrompts } from "../../lib/dailyDropPrompts";
import { DailyDrop } from '../../types/home';


type DailyDropState =
  | "idle"
  | "answering"
  | "submitted"
  | "viewing"
  | "skipped";

interface Response {
  _id: string;
  userId: string;
  userName: string;
  response: string;
}
type DailyDropCardProps = {
  drop: DailyDrop;
};

export default function DailyDropCard({ drop }: DailyDropCardProps) {
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [state, setState] = useState<DailyDropState>("idle");
  const [answer, setAnswer] = useState("");
  const [prompt, setPrompt] = useState("");
  const [responses, setResponses] = useState<Response[]>([]);
  const [characterCount, setCharacterCount] = useState(0);
const [editingId, setEditingId] = useState<string | null>(null);
const [editText, setEditText] = useState("");



  /* ==============================
     FETCH USER MOOD FROM DB
  ============================== */
  useEffect(() => {
    async function fetchMood() {
      const res = await fetch("/api/mood/today");
      const data = await res.json();

      const userMood = data?.mood || "okay";
      setPrompt(moodPrompts[userMood]);
    }

    fetchMood();
  }, []);

  /* ==============================
     FETCH RESPONSES
  ============================== */
  const fetchResponses = async () => {
    const res = await fetch("/api/daily-drop/responses");
    const data = await res.json();
    setResponses(data);
  };

  /* ==============================
     SUBMIT ANSWER
  ============================== */
  const handleSubmit = async () => {
    if (!answer.trim()) return;

    await fetch("/api/daily-drop/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response: answer,
      }),
    });

    setState("submitted");
  };

  useEffect(() => {
    if (state === "answering" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [state]);

  /* ==============================
     VIEWING RESPONSES
  ============================== */
  if (state === "viewing") {
    return (
      <section className="daily-drop-card my-6">
        <h3 className="text-xl font-semibold mb-4">{prompt}</h3>

        <div className="space-y-3">
          {responses.map((r) => (
           <div
  key={r._id}
  className="p-4 bg-black rounded-xl border relative"
>
  {/* Edit Mode */}
  {editingId === r._id ? (
    <>
      <textarea
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        className="w-full p-3 border rounded-lg"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => handleEditSave(r._id)}
          className="px-3 py-1 text-sm bg-black text-white rounded"
        >
          Save
        </button>
        <button
          onClick={() => {
            setEditingId(null);
            setEditText("");
          }}
          className="px-3 py-1 text-sm border rounded"
        >
          Cancel
        </button>
      </div>
    </>
  ) : (
    <>
      <p className="text-stone-300">{r.response}</p>
      <span className="text-xs text-stone-400">
        — {r.userName}
      </span>
    </>
  )}

  {/* ACTION ICONS (ONLY OWN RESPONSE) */}
  {session?.user?.id === r.userId && editingId !== r._id && (
    <div className="absolute top-3 right-3 flex gap-2 text-sm">
      <button
        onClick={() => {
          setEditingId(r._id);
          setEditText(r.response);
        }}
        title="Edit"
        className="text-blue-500 hover:text-blue-700"
      >
        ✏️
      </button>
      <button
        onClick={() => handleDelete(r._id)}
        title="Delete"
        className="text-red-500 hover:text-red-700"
      >
        🗑
      </button>
    </div>
  )}
</div>

          ))}
        </div>

        <button
          onClick={() => setState("answering")}
          className="mt-6 w-full py-3 rounded-xl bg-black text-white"
        >
          Add your response
        </button>
      </section>
    );
  }

  /* ==============================
     ANSWERING
  ============================== */
  if (state === "answering") {
    return (
      <section className="daily-drop-card my-6">
        <h3 className="text-xl font-serif mb-4">{prompt}</h3>

        <textarea
          ref={textareaRef}
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            setCharacterCount(e.target.value.length);
          }}
          maxLength={300}
          className="w-full h-40 p-4 border rounded-xl"
          placeholder="Write what you feel..."
        />

        <div className="flex justify-between mt-3 text-xs text-stone-400">
          <span>{characterCount}/300</span>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-black text-white py-3 rounded-xl"
          >
            Share
          </button>
          <button
            onClick={() => setState("idle")}
            className="px-4 py-3 border rounded-xl"
          >
            Cancel
          </button>
        </div>
      </section>
    );
  }

  /* ==============================
     SUBMITTED
  ============================== */
  if (state === "submitted") {
    return (
      <section className="daily-drop-card my-6 text-center">
        <h3 className="text-xl font-serif mb-2">
          Thanks for sharing 🌱
        </h3>
        <p className="text-stone-500 mb-4">
          You’re not alone.
        </p>

        <button
          onClick={() => {
            fetchResponses();
            setState("viewing");
          }}
          className="w-full py-3 bg-stone-800 text-white rounded-xl"
        >
          Read others
        </button>
      </section>
    );
  }

async function handleEditSave(responseId: string) {
  if (!editText.trim()) return;

  await fetch("/api/daily-drop/update", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      responseId,
      newResponse: editText,
    }),
  });

  setResponses((prev) =>
    prev.map((r) =>
      r._id === responseId ? { ...r, response: editText } : r
    )
  );

  setEditingId(null);
  setEditText("");
}

async function handleDelete(responseId: string) {
  if (!confirm("Delete your response?")) return;

  await fetch("/api/daily-drop/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responseId }),
  });

  setResponses((prev) => prev.filter((r) => r._id !== responseId));
}



  /* ==============================
     DEFAULT (IDLE)
  ============================== */
  return (
    <section className="daily-drop-card my-6">
      <h3 className="text-2xl font-serif mb-6">
        {prompt || "How are you feeling today?"}
      </h3>

      <div className="space-y-3">
        <button
          onClick={() => setState("answering")}
          className="w-full py-4 bg-black text-white rounded-xl"
        >
          Share your thoughts
        </button>

        <button
          onClick={() => {
            fetchResponses();
            setState("viewing");
          }}
          className="w-full py-4 border rounded-xl"
        >
          Read others
        </button>

        <button
          onClick={() => setState("skipped")}
          className="text-sm text-stone-400"
        >
          Skip
        </button>
      </div>
    </section>
  );
}
