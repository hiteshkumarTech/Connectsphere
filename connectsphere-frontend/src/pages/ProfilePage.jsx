import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, Link as LinkIcon, MapPin, Lock, Camera, FileText } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFeed } from '../hooks/useFeed';
import { formatCount } from '../lib/format';
import Avatar from '../components/ui/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import PostFeed from '../components/post/PostFeed.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Spinner from '../components/ui/Spinner.jsx';

function Stat({ value, label }) {
  return (
    <div className="text-center">
      <p className="font-display text-lg font-bold text-ink dark:text-white">{formatCount(value || 0)}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function EditProfileModal({ open, onClose, profile, onSaved }) {
  const { patchUser } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ name: '', bio: '', website: '', location: '' });
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setForm({
        name: profile.name || '',
        bio: profile.bio || '',
        website: profile.website || '',
        location: profile.location || '',
      });
      setAvatar(profile.avatar || '');
    }
  }, [open, profile]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const changeAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await api.post('/users/me/avatar', fd);
      setAvatar(data.data.avatar);
      patchUser({ avatar: data.data.avatar });
      onSaved({ avatar: data.data.avatar });
      toast('Photo updated', 'success');
    } catch (err) {
      toast(apiError(err), 'error');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', form);
      patchUser(data.data.user);
      onSaved(data.data.user);
      toast('Profile updated', 'success');
      onClose();
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <div className="flex items-center gap-4">
        <Avatar src={avatar} name={form.name} size="lg" />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Camera size={16} /> Change photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={changeAvatar} className="hidden" />
      </div>
      <div className="mt-4 space-y-3">
        <Input id="name" name="name" label="Display name" value={form.name} onChange={onChange} />
        <Textarea id="bio" name="bio" label="Bio" rows={3} value={form.bio} onChange={onChange} placeholder="Tell people who you are" />
        <Input id="website" name="website" label="Website" value={form.website} onChange={onChange} placeholder="https://" />
        <Input id="location" name="location" label="Location" value={form.location} onChange={onChange} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save changes</Button>
      </div>
    </Modal>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [info, setInfo] = useState({ isMe: false, isFollowing: false, isPrivate: false });
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);

  const feed = useFeed(`/posts/user/${username}`);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMissing(false);
    api
      .get(`/users/${username}`)
      .then(({ data }) => {
        if (!active) return;
        setProfile(data.data.user);
        setInfo({ isMe: data.data.isMe, isFollowing: data.data.isFollowing, isPrivate: data.data.isPrivate });
      })
      .catch(() => active && setMissing(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [username]);

  const toggleFollow = async () => {
    const following = info.isFollowing;
    setInfo((s) => ({ ...s, isFollowing: !following }));
    setProfile((p) => ({ ...p, followersCount: (p.followersCount || 0) + (following ? -1 : 1) }));
    try {
      if (following) await api.delete(`/users/${username}/follow`);
      else await api.post(`/users/${username}/follow`);
    } catch (err) {
      setInfo((s) => ({ ...s, isFollowing: following }));
      setProfile((p) => ({ ...p, followersCount: (p.followersCount || 0) + (following ? 1 : -1) }));
      toast(apiError(err), 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }
  if (missing || !profile) {
    return <EmptyState title="User not found" subtitle={`@${username} doesn't exist or is unavailable.`} />;
  }

  return (
    <div className="pb-4">
      {/* Cover */}
      <div className="ai-gradient relative h-36 w-full overflow-hidden sm:h-48 sm:rounded-b-2xl">
        {profile.coverImage && (
          <img src={profile.coverImage} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      {/* Header */}
      <div className="px-4">
        <div className="-mt-10 flex items-end justify-between sm:-mt-12">
          <Avatar
            src={profile.avatar}
            name={profile.name}
            size="xl"
            className="ring-4 ring-slate-50 dark:ring-slate-950"
          />
          {info.isMe ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit profile
            </Button>
          ) : (
            <Button variant={info.isFollowing ? 'secondary' : 'primary'} onClick={toggleFollow}>
              {info.isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>

        <div className="mt-3">
          <h1 className="flex items-center gap-1.5 font-display text-xl font-bold text-ink dark:text-white">
            {profile.name}
            {profile.verifiedBadge && <BadgeCheck size={18} className="text-brand-500" />}
          </h1>
          <p className="text-sm text-slate-400">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-2 whitespace-pre-wrap text-[15px] text-slate-700 dark:text-slate-200">
              {profile.bio}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {profile.location}
              </span>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
              >
                <LinkIcon size={14} /> {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
          <div className="mt-4 flex gap-6">
            <Stat value={profile.postsCount} label="Posts" />
            <Stat value={profile.followersCount} label="Followers" />
            <Stat value={profile.followingCount} label="Following" />
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800 sm:border-0 sm:pt-5">
        {info.isPrivate ? (
          <EmptyState
            icon={Lock}
            title="This account is private"
            subtitle="Follow this account to see their posts."
          />
        ) : (
          <PostFeed
            posts={feed.posts}
            loading={feed.loading}
            hasMore={feed.hasMore}
            loadMore={feed.loadMore}
            onDeleted={feed.removeById}
            empty={
              <EmptyState
                icon={FileText}
                title={info.isMe ? 'You haven’t posted yet' : 'No posts yet'}
                subtitle={info.isMe ? 'Share your first post from the home feed.' : 'Check back later.'}
              />
            }
          />
        )}
      </div>

      <EditProfileModal
        open={editing}
        onClose={() => setEditing(false)}
        profile={profile}
        onSaved={(u) => setProfile((p) => ({ ...p, ...u }))}
      />
    </div>
  );
}
