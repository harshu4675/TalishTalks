import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiEye, FiImage, FiPlus, FiTrash2, FiX } from "react-icons/fi";

import { storyApi } from "../../../core/api/endpoints.js";
import { useAuth } from "../../../core/auth/useAuth.js";
import Avatar from "../../../shared/components/Avatar.jsx";
import Button from "../../../shared/components/Button.jsx";
import ConfirmDialog from "../../../shared/components/ConfirmDialog.jsx";
import { Skeleton } from "../../../shared/components/Feedback.jsx";
import Modal from "../../../shared/components/Modal.jsx";
import { useToast } from "../../../shared/components/useToast.js";

const STORY_DURATION = 7000;
const isMine = (group, userId) => String(group?.author?._id) === String(userId);

export default function StoriesStrip() {
  const { user } = useAuth();
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [deleteStory, setDeleteStory] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [paused, setPaused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await storyApi.list();
      setGroups(response.stories || []);
      setLoadError("");
    } catch (error) {
      if (!quiet) setLoadError(error.message || "Stories could not be loaded.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(() => refresh(true), 60000);
    const onFocus = () => refresh(true);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    const updateVisibility = () => setDocumentHidden(document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  const ownGroup = groups.find((group) => isMine(group, user?._id));
  const groupStories = useMemo(() => {
    if (!viewer) return [];
    return viewer.group.stories || [];
  }, [viewer]);
  const activeStory = groupStories[viewer?.storyIndex || 0];

  const closeComposer = () => {
    setComposerOpen(false);
    setText("");
    setImage(null);
    setImagePreview("");
  };

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Unsupported image", "Choose a JPEG, PNG, WebP or GIF image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large", "Story images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const createStory = async (event) => {
    event.preventDefault();
    if (!text.trim() && !image) return;
    setSaving(true);
    try {
      const response = await storyApi.create({ text: text.trim(), image });
      const nextStory = response.story;
      setGroups((current) => {
        const updated = current.map((group) => isMine(group, user?._id)
          ? { ...group, stories: [...group.stories, nextStory] }
          : group);
        if (updated.some((group) => isMine(group, user?._id))) return updated;
        return [{ author: user, stories: [nextStory] }, ...updated];
      });
      closeComposer();
      toast.success("Story shared", "Your story will be available to friends for 24 hours.");
    } catch (error) {
      toast.error("Could not share story", error.message);
    } finally {
      setSaving(false);
    }
  };

  const openStory = (group, storyIndex = 0) => {
    setViewer({ group, storyIndex });
    setElapsed(0);
    setPaused(false);
  };

  const move = useCallback((direction) => {
    if (!viewer) return;
    setElapsed(0);
    setPaused(false);
    const stories = viewer.group.stories || [];
    const nextIndex = viewer.storyIndex + direction;
    if (nextIndex >= 0 && nextIndex < stories.length) {
      setViewer((current) => ({ ...current, storyIndex: nextIndex }));
      return;
    }
    const currentGroupIndex = groups.findIndex((group) => String(group.author?._id) === String(viewer.group.author?._id));
    const nextGroup = groups[currentGroupIndex + direction];
    if (!nextGroup) {
      setViewer(null);
      return;
    }
    setViewer({ group: nextGroup, storyIndex: direction > 0 ? 0 : nextGroup.stories.length - 1 });
  }, [groups, viewer]);

  useEffect(() => {
    if (!viewer || !activeStory || isMine(viewer.group, user?._id)) return;
    if (activeStory.viewedByMe) return;
    storyApi.markViewed(activeStory._id).then(() => {
      setGroups((current) => current.map((group) => ({
        ...group,
        stories: group.stories.map((story) => story._id === activeStory._id
          ? { ...story, viewedByMe: true }
          : story),
      })));
    }).catch(() => {});
  }, [viewer, activeStory, user?._id]);

  useEffect(() => {
    if (!viewer || paused || documentHidden) return undefined;
    timerRef.current = window.setInterval(() => {
      setElapsed((current) => Math.min(current + 200, STORY_DURATION));
    }, 200);
    return () => window.clearInterval(timerRef.current);
  }, [viewer, paused, documentHidden]);

  useEffect(() => {
    if (viewer && elapsed >= STORY_DURATION) move(1);
  }, [viewer, elapsed, move]);

  useEffect(() => {
    if (!viewer) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalOverflow; };
  }, [viewer]);

  useEffect(() => {
    if (!viewer) return undefined;
    const keyHandler = (event) => {
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "Escape") setViewer(null);
      if (event.key === " ") {
        event.preventDefault();
        setPaused((current) => !current);
      }
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [viewer, move]);

  const confirmDelete = async () => {
    if (!deleteStory) return;
    setDeleting(true);
    try {
      await storyApi.remove(deleteStory._id);
      setGroups((current) => current.map((group) => ({
        ...group,
        stories: group.stories.filter((story) => story._id !== deleteStory._id),
      })).filter((group) => group.stories.length));
      if (activeStory?._id === deleteStory._id) setViewer(null);
      setDeleteStory(null);
      toast.success("Story deleted");
    } catch (error) {
      toast.error("Could not delete story", error.message);
    } finally {
      setDeleting(false);
    }
  };

  const openMine = () => {
    if (ownGroup?.stories?.length) openStory(ownGroup, 0);
    else setComposerOpen(true);
  };

  return (
    <section className="stories" aria-label="Stories">
      <div className="stories__heading">
        <div>
          <h2>Stories</h2>
          <p>Moments from your circle, gone in 24 hours.</p>
        </div>
        {ownGroup?.stories?.length ? (
          <Button variant="ghost" size="sm" onClick={() => setComposerOpen(true)}>
            <FiPlus size={15} /> Add story
          </Button>
        ) : null}
      </div>
      {loading ? (
        <div className="stories__list" aria-label="Loading stories">
          {[0, 1, 2, 3].map((index) => <div className="story-skeleton" key={index}><Skeleton circle width={58} height={58} /><Skeleton width={48} height={9} /></div>)}
        </div>
      ) : loadError ? (
        <div className="stories__error" role="status">{loadError} <button type="button" onClick={() => refresh()}>Retry</button></div>
      ) : (
        <div className="stories__list">
          <button type="button" className="story-tile story-tile--create" onClick={openMine} aria-label={ownGroup ? "View your story" : "Create a story"}>
            <span className="story-tile__ring story-tile__ring--self">
              <Avatar src={user?.avatar} name={user?.fullName} size="lg" />
              {!ownGroup?.stories?.length && <span className="story-tile__add"><FiPlus size={14} /></span>}
            </span>
            <span className="story-tile__label">Your story</span>
          </button>
          {groups.filter((group) => !isMine(group, user?._id)).map((group) => {
            const hasUnseen = group.stories.some((story) => !story.viewedByMe);
            return <button type="button" className="story-tile" key={group.author._id} onClick={() => openStory(group)} aria-label={`View ${group.author.fullName}'s story`}>
              <span className={`story-tile__ring ${hasUnseen ? "story-tile__ring--new" : "story-tile__ring--seen"}`}>
                <Avatar src={group.author.avatar} name={group.author.fullName} size="lg" />
              </span>
              <span className="story-tile__label">{group.author.fullName.split(" ")[0]}</span>
            </button>;
          })}
          {!groups.some((group) => !isMine(group, user?._id)) && !ownGroup?.stories?.length ? <p className="stories__empty">Stories from your friends will appear here.</p> : null}
        </div>
      )}

      <Modal open={composerOpen} onClose={closeComposer} title="Create a story" subtitle="Share a moment with your friends. It disappears after 24 hours." footer={
        <><Button variant="secondary" onClick={closeComposer} disabled={saving}>Cancel</Button><Button onClick={createStory} loading={saving} disabled={!text.trim() && !image}>Share story</Button></>
      }>
        <form className="story-form" onSubmit={createStory}>
          {imagePreview ? <div className="story-form__preview"><img src={imagePreview} alt="Story preview" /><button type="button" onClick={() => { setImage(null); setImagePreview(""); }} aria-label="Remove selected image"><FiX size={16} /></button></div> : null}
          <label className="field"><span className="field__label">Your moment</span><textarea className="input story-form__text" value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder="Write something worth remembering" /></label>
          <div className="story-form__tools"><label className="btn btn--secondary btn--sm"><FiImage size={15} /> {image ? "Change image" : "Add image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImage} /></label><span>{text.length}/500</span></div>
        </form>
      </Modal>

      {viewer && activeStory ? <div className="story-viewer" role="dialog" aria-modal="true" aria-label={`${viewer.group.author.fullName}'s story`} onPointerDown={(event) => { if (event.target === event.currentTarget) setViewer(null); }}>
        <div className="story-viewer__stage">
          <div className="story-viewer__progress" aria-label="Story progress">{groupStories.map((story, index) => <span className="story-viewer__track" key={story._id}><i style={{ width: index < viewer.storyIndex ? "100%" : index === viewer.storyIndex ? `${(elapsed / STORY_DURATION) * 100}%` : "0%" }} /></span>)}</div>
          <header className="story-viewer__header"><Avatar src={viewer.group.author.avatar} name={viewer.group.author.fullName} size="sm" /><div><strong>{viewer.group.author.fullName}</strong><time>{new Date(activeStory.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div>
            {isMine(viewer.group, user?._id) ? <button type="button" className="story-viewer__action" onClick={() => setDeleteStory(activeStory)} aria-label="Delete this story"><FiTrash2 size={18} /></button> : null}
            <button type="button" className="story-viewer__action" onClick={() => setViewer(null)} aria-label="Close story"><FiX size={21} /></button>
          </header>
          {activeStory.media?.url ? <img className="story-viewer__image" src={activeStory.media.url} alt="Story" loading="eager" /> : <div className="story-viewer__text">{activeStory.text}</div>}
          {activeStory.media?.url && activeStory.text ? <p className="story-viewer__caption">{activeStory.text}</p> : null}
          <button type="button" className="story-viewer__tap story-viewer__tap--previous" onClick={() => move(-1)} aria-label="Previous story"><FiChevronLeft /></button>
          <button type="button" className="story-viewer__tap story-viewer__tap--next" onClick={() => move(1)} aria-label="Next story"><FiChevronRight /></button>
          <button type="button" className="story-viewer__pause" onClick={() => setPaused((current) => !current)} aria-label={paused ? "Resume story" : "Pause story"}>{paused ? "Resume" : "Pause"}</button>
          {isMine(viewer.group, user?._id) ? <div className="story-viewer__views"><FiEye size={15} /><span>{activeStory.viewerCount || 0} {activeStory.viewerCount === 1 ? "view" : "views"}</span>{activeStory.viewers?.length ? <span className="story-viewer__viewer-list">{activeStory.viewers.map((entry) => entry.user?.fullName).filter(Boolean).join(", ")}</span> : null}</div> : null}
        </div>
      </div> : null}
      <ConfirmDialog open={Boolean(deleteStory)} onClose={() => setDeleteStory(null)} onConfirm={confirmDelete} title="Delete this story?" message="This story will be removed for everyone and cannot be restored." confirmLabel="Delete story" danger busy={deleting} />
    </section>
  );
}
