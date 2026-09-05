import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { ImPlus } from "react-icons/im";

import { ADD_THOUGHT } from "../../utils/mutations.ts";
import { QUERY_THOUGHTS, QUERY_ME } from "../../utils/queries.ts";

const MAX_LENGTH = 280;

const PostModal = ({ setModalOn }) => {
  const [thoughtText, setThoughtText] = useState("");
  const [selectedBuildId, setSelectedBuildId] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Only the poster's own builds can be attached, so this always asks about the
  // signed-in user rather than whichever profile is being viewed.
  const { loading, data } = useQuery(QUERY_ME);
  const user = data?.me ?? null;
  const builds = user?.builds ?? [];

  const [addThought, { loading: submitting }] = useMutation(ADD_THOUGHT, {
    update(cache, { data: mutationData }) {
      const created = mutationData?.addThought;
      if (!created) return;

      // Both of these can legitimately miss: the cache only holds a query once
      // something has actually run it. A miss is not an error.
      try {
        const existing = cache.readQuery({ query: QUERY_ME });
        if (existing?.me) {
          cache.writeQuery({
            query: QUERY_ME,
            data: { me: { ...existing.me, thoughts: [created, ...existing.me.thoughts] } },
          });
        }
      } catch {
        // No cached profile yet.
      }

      try {
        const existing = cache.readQuery({ query: QUERY_THOUGHTS });
        if (existing?.thoughts) {
          cache.writeQuery({
            query: QUERY_THOUGHTS,
            data: { thoughts: [created, ...existing.thoughts] },
          });
        }
      } catch {
        // No cached feed yet.
      }
    },
  });

  const handleChange = (event) => {
    setThoughtText(event.target.value.slice(0, MAX_LENGTH));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (!thoughtText.trim()) {
      setSubmitError("Write something before posting.");
      return;
    }

    try {
      await addThought({
        variables: {
          thoughtText: thoughtText.trim(),
          // The old code sent the whole world as a JSON string on every post.
          // It now sends the id of a saved build, or nothing at all.
          buildId: selectedBuildId || null,
        },
      });
      setModalOn(false);
    } catch (error) {
      setSubmitError(error.message ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="bg-zinc-800/80 fixed inset-0 z-100">
      <div className="flex h-screen justify-center items-center mx-auto w-1/2 sm:w-full">
        <div className="flex-col justify-center bg-zinc-900 py-12 px-16 border-2 border-gray-300 rounded-xl sm:w-1/2">
          <div className="minecraft text-3xl text-white mb-8 flex flex-col items-center border-b-2">
            <div className="flex items-center">
              <ImPlus size={18} />
              <span className="ml-3">Add Post</span>
            </div>
          </div>

          <form className="flex flex-col items-center w-full p-2 mb-2" onSubmit={handleSubmit}>
            {loading ? (
              <p className="text-gray-400 text-sm mb-3">Loading your builds...</p>
            ) : (
              // The old condition was `{builds.length && ...}`, which renders a
              // literal 0 on the page when the list is empty.
              builds.length > 0 && (
                <select
                  className="bg-gray-700 text-gray-300 mb-3"
                  onChange={(event) => setSelectedBuildId(event.target.value)}
                  value={selectedBuildId}
                  id="dropdown"
                  aria-label="Attach one of your builds"
                >
                  <option value="">No build attached</option>
                  {builds.map((build) => (
                    <option key={build._id} value={build._id}>
                      {build.name}
                    </option>
                  ))}
                </select>
              )
            )}

            <p
              className={`text-xs mb-1 ${
                thoughtText.length === MAX_LENGTH || submitError
                  ? "text-red-400"
                  : "text-gray-400"
              }`}
            >
              Character Count: {thoughtText.length}/{MAX_LENGTH}
            </p>
            {submitError && <p className="text-xs text-red-400 mb-1">{submitError}</p>}

            <textarea
              placeholder="Share something new!"
              value={thoughtText}
              name="thoughtText"
              aria-label="Post text"
              className="block p-2.5 w-full text-sm rounded-lg border bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"
              rows="4"
              onChange={handleChange}
            />

            <div className="flex flex-col items-center sm:flex-row sm:justify-evenly px-2 w-full">
              <button
                type="submit"
                disabled={submitting}
                className="btn-minecraft mt-2 duration-300 hover:scale-105 disabled:opacity-60"
              >
                {submitting ? "Posting..." : "Post"}
              </button>
              <button
                type="button"
                onClick={() => setModalOn(false)}
                className="btn-minecraft mt-2 duration-300 hover:scale-105"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostModal;
