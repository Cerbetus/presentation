import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../hooks/useAuth";

export default function DashboardPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const userId = session?.user?.id;

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!userId) return;

    async function loadDecks() {
      const { data, error: err } = await supabase
        .from("decks")
        .select("*")
        .order("created_at", { ascending: false });
      if (err) setError(err.message);
      else setDecks(data ?? []);
    }

    loadDecks();
  }, [userId, refreshKey]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pptx")) {
      setError("Only .pptx files are supported.");
      return;
    }

    setError(null);
    setUploading(true);

    const filePath = `${userId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("decks")
      .upload(filePath, file, { contentType: file.type });

    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      return;
    }

    const { error: dbErr } = await supabase.from("decks").insert({
      user_id: userId,
      name: file.name,
      storage_path: filePath,
      slide_count: 20, // default; presenter can adjust later
    });

    if (dbErr) setError(dbErr.message);
    else refresh();

    setUploading(false);
    e.target.value = "";
  }

  async function handleDelete(deck) {
    if (!confirm(`Delete "${deck.name}"?`)) return;

    await supabase.storage.from("decks").remove([deck.storage_path]);
    await supabase.from("decks").delete().eq("id", deck.id);
    refresh();
  }

  async function handleCreateSession(deck) {
    const { data, error: err } = await supabase
      .from("sessions")
      .insert({ user_id: userId, deck_id: deck.id })
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }

    navigate(`/present/${data.id}`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">My Decks</h1>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-900/60 text-red-200 text-sm rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {/* Upload */}
        <label className="flex items-center justify-center gap-3 bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl p-6 cursor-pointer hover:border-blue-500 transition">
          <span className="text-gray-400">
            {uploading ? "Uploading…" : "Upload PPTX"}
          </span>
          <input
            type="file"
            accept=".pptx"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>

        {/* Deck list */}
        {decks.length === 0 && (
          <p className="text-gray-500 text-center">
            No decks yet. Upload a PPTX to get started.
          </p>
        )}

        <ul className="space-y-3">
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="bg-gray-900 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{deck.name}</p>
                <p className="text-xs text-gray-500">
                  {deck.slide_count} slides •{" "}
                  {new Date(deck.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCreateSession(deck)}
                  className="bg-blue-600 hover:bg-blue-700 text-sm px-4 py-2 rounded-lg transition"
                >
                  Present
                </button>
                <button
                  onClick={() => handleDelete(deck)}
                  className="bg-red-700 hover:bg-red-800 text-sm px-4 py-2 rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
