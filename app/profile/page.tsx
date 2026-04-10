'use client';

/*
  Schema is managed via supabase/migrations/. See:
    001_profiles.sql  — profiles table + RLS
    002_rls_policies.sql — profile column additions + reviews RLS

  Required columns (run once in Supabase SQL editor):
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation TEXT;
*/

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria',
  'Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina',
  'Brazil','Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia','Costa Rica',
  'Croatia','Cuba','Cyprus','Czech Republic','Denmark','Ecuador','Egypt','Estonia','Ethiopia',
  'Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Hungary','India',
  'Indonesia','Iran','Iraq','Ireland','Israel','Italy','Japan','Jordan','Kazakhstan','Kenya',
  'Kuwait','Latvia','Lebanon','Lithuania','Luxembourg','Malaysia','Mexico','Moldova','Mongolia',
  'Morocco','Netherlands','New Zealand','Nigeria','North Macedonia','Norway','Oman','Pakistan',
  'Palestine','Panama','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia',
  'Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea',
  'Spain','Sri Lanka','Sweden','Switzerland','Taiwan','Thailand','Tunisia','Turkey','Ukraine',
  'United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Venezuela',
  'Vietnam','Yemen',
];

export default function ProfilePage() {
  const router = useRouter();
  const [lang, setLang] = useState<'tr' | 'en'>('en');
  const isTR = lang === 'tr';

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Age derived from birth date — not stored separately
  const ageYears = birthDate
    ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  useEffect(() => {
    const stored = localStorage.getItem('mp-lang') as 'tr' | 'en' | null;
    if (stored === 'tr' || stored === 'en') setLang(stored);
    else if (navigator.language.startsWith('tr')) setLang('tr');
  }, []);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Parse Google full name into first/last as fallback
      const googleFull = user.user_metadata?.full_name ?? user.user_metadata?.name ?? '';
      const parts = googleFull.trim().split(/\s+/);
      const googleFirst = parts[0] || '';
      const googleLast = parts.slice(1).join(' ') || '';
      const googleAvatar = user.user_metadata?.avatar_url ?? '';

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, country, city, birth_date, phone, occupation')
        .eq('id', user.id)
        .single();

      if (!isMounted) return;

      setUserId(user.id);
      setEmail(user.email || '');
      setFirstName(profile?.first_name || googleFirst);
      setLastName(profile?.last_name || googleLast);
      setOccupation(profile?.occupation || '');
      setBirthDate(profile?.birth_date || '');
      setCountry(profile?.country || '');
      setCity(profile?.city || '');
      setPhone(profile?.phone || '');
      const savedAvatar = profile?.avatar_url || '';
      setAvatarUrl(savedAvatar);
      setAvatarPreview(savedAvatar || googleAvatar);
    };

    fetchProfile();
    return () => { isMounted = false; };
  }, [router]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const bustedUrl = publicUrl + '?v=' + Date.now();
      setAvatarUrl(bustedUrl);
      setAvatarPreview(bustedUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(isTR ? 'Fotoğraf yüklenemedi: ' + msg : 'Failed to upload photo: ' + msg);
    } finally {
      setUploadingAvatar(false);
      // Always reset via ref — event target may be stale after async operations
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const supabase = createClient();
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: userId,
        first_name: firstName || null,
        last_name: lastName || null,
        occupation: occupation || null,
        birth_date: birthDate || null,
        avatar_url: avatarUrl || null,
        country: country || null,
        city: city || null,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      });
      if (upsertErr) throw upsertErr;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(isTR ? 'Kaydedilemedi: ' + msg : 'Could not save: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || email[0]?.toUpperCase() || '?';

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; color: #1a1a1a; }
        .pf-wrap { min-height: 100vh; background: #fff; font-family: 'Satoshi', sans-serif; }
        .pf-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px; height: 68px; background: #fff;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          position: sticky; top: 0; z-index: 100;
        }
        .back-link {
          display: flex; align-items: center; gap: 6px;
          color: #666; font-size: 0.9rem; font-weight: 500;
          transition: color 0.2s; background: none; border: none; cursor: pointer;
          font-family: 'Satoshi', sans-serif;
        }
        .back-link:hover { color: #FF6B35; }
        .pf-hero { text-align: center; padding: 52px 24px 36px; }
        .pf-badge {
          display: inline-block; background: rgba(255,107,53,0.08); color: #FF6B35;
          font-size: 0.82rem; font-weight: 600; letter-spacing: 0.06em;
          padding: 6px 14px; border-radius: 100px; margin-bottom: 20px;
        }
        .pf-title {
          font-family: 'Clash Display', sans-serif; font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 600; line-height: 1.12; color: #1a1a1a; margin-bottom: 10px;
        }
        .pf-title em { font-style: normal; color: #FF6B35; }
        .pf-subtitle { color: #888; font-size: 0.95rem; }
        .pf-content { max-width: 560px; margin: 0 auto; padding: 0 24px 80px; }
        .pf-section-title {
          font-family: 'Clash Display', sans-serif; font-size: 1rem; font-weight: 600;
          color: #1a1a1a; margin-bottom: 18px; padding-left: 10px;
          border-left: 3px solid #FF6B35;
        }
        .pf-divider { height: 1px; background: #f0f0f0; margin: 32px 0; }
        .pf-avatar-area { display: flex; align-items: center; gap: 20px; margin-bottom: 28px; }
        .pf-avatar-btn {
          position: relative; width: 80px; height: 80px; border-radius: 50%; overflow: hidden;
          cursor: pointer; border: 2px dashed rgba(255,107,53,0.4); background: rgba(255,107,53,0.04);
          transition: border-color 0.2s; flex-shrink: 0;
        }
        .pf-avatar-btn:hover { border-color: #FF6B35; }
        .pf-avatar-btn img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .pf-avatar-initials {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          background: #FF6B35; color: #fff; font-size: 1.8rem; font-weight: 700;
          font-family: 'Clash Display', sans-serif;
        }
        .pf-avatar-overlay {
          position: absolute; inset: 0; background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s; border-radius: 50%;
        }
        .pf-avatar-btn:hover .pf-avatar-overlay { opacity: 1; }
        .pf-avatar-hint { font-size: 0.85rem; color: #888; line-height: 1.5; }
        .pf-avatar-hint strong { color: #333; font-size: 0.9rem; display: block; margin-bottom: 2px; }
        .pf-label { display: block; font-size: 0.88rem; font-weight: 600; color: #333; margin-bottom: 7px; letter-spacing: 0.02em; }
        .pf-input, .pf-select {
          width: 100%; padding: 11px 14px; border-radius: 10px;
          border: 1px solid #E5E5E5; font-family: 'Satoshi', sans-serif;
          font-size: 0.95rem; color: #1a1a1a; background: #FAFAFA;
          transition: border-color 0.2s; outline: none; margin-bottom: 16px;
        }
        .pf-input:focus, .pf-select:focus { border-color: #FF6B35; background: #fff; }
        .pf-input[readonly] { color: #999; cursor: default; background: #F5F5F5; }
        .pf-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }
        .pf-row { display: flex; gap: 12px; }
        .pf-row > div { flex: 1; }
        .pf-age-hint { font-size: 0.82rem; color: #999; margin-top: -10px; margin-bottom: 16px; }
        .pf-btn {
          width: 100%; padding: 14px 24px; background: #FF6B35; color: white;
          border: none; border-radius: 12px; font-family: 'Clash Display', sans-serif;
          font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(255,107,53,0.3); margin-top: 8px;
        }
        .pf-btn:hover:not(:disabled) { background: #E85A28; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(255,107,53,0.4); }
        .pf-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .pf-toast {
          margin-top: 14px; padding: 11px 16px; border-radius: 10px; font-size: 0.9rem; font-weight: 500;
          display: flex; align-items: center; gap: 8px;
        }
        .pf-toast.success { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); color: #059669; }
        .pf-toast.error { background: rgba(204,51,0,0.06); border: 1px solid rgba(204,51,0,0.2); color: #CC3300; }
        @media (max-width: 540px) {
          .pf-nav { padding: 0 20px; }
          .pf-row { flex-direction: column; gap: 0; }
        }
      `}</style>
      <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />

      <div className="pf-wrap">
        <nav className="pf-nav">
          <a className="back-link" href="/">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isTR ? "MockPlacer'a Dön" : 'Back to MockPlacer'}
          </a>
          <a href="/" style={{ display: 'block', lineHeight: 0 }}>
            <Image src="/1logo.png" width={140} height={35} alt="MockPlacer" style={{ display: 'block' }} />
          </a>
        </nav>

        <div className="pf-hero">
          <div className="pf-badge">{isTR ? 'Profil' : 'Profile'}</div>
          <h1 className="pf-title">
            {isTR ? <>Profil <em>Ayarları</em></> : <>Profile <em>Settings</em></>}
          </h1>
          <p className="pf-subtitle">
            {isTR ? 'Kişisel bilgilerinizi güncelleyin.' : 'Update your personal information.'}
          </p>
        </div>

        <div className="pf-content">
          <form onSubmit={handleSubmit}>

            {/* Avatar */}
            <div className="pf-section-title">{isTR ? 'Profil Fotoğrafı' : 'Profile Photo'}</div>
            <div className="pf-avatar-area">
              <button type="button" className="pf-avatar-btn" onClick={handleAvatarClick} disabled={uploadingAvatar}>
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="" />
                ) : (
                  <div className="pf-avatar-initials">{initials}</div>
                )}
                <div className="pf-avatar-overlay">
                  {uploadingAvatar ? (
                    <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  )}
                </div>
              </button>
              <div className="pf-avatar-hint">
                <strong>{isTR ? 'Fotoğraf Yükle' : 'Upload Photo'}</strong>
                {isTR ? 'JPG veya PNG, en fazla 5 MB' : 'JPG or PNG, up to 5 MB'}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>

            <div className="pf-divider" />

            {/* Personal info */}
            <div className="pf-section-title">{isTR ? 'Kişisel Bilgiler' : 'Personal Info'}</div>

            <div className="pf-row">
              <div>
                <label className="pf-label">{isTR ? 'Ad' : 'First Name'}</label>
                <input
                  type="text"
                  className="pf-input"
                  placeholder={isTR ? 'Adınız' : 'First name'}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="pf-label">{isTR ? 'Soyad' : 'Last Name'}</label>
                <input
                  type="text"
                  className="pf-input"
                  placeholder={isTR ? 'Soyadınız' : 'Last name'}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <label className="pf-label">{isTR ? 'Meslek' : 'Occupation'}</label>
            <input
              type="text"
              className="pf-input"
              placeholder={isTR ? 'örn. Etsy Satıcısı, Tasarımcı' : 'e.g. Etsy Seller, Designer'}
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />

            <label className="pf-label">E-mail</label>
            <input
              type="email"
              className="pf-input"
              value={email}
              readOnly
              tabIndex={-1}
            />

            <div className="pf-row">
              <div>
                <label className="pf-label">{isTR ? 'Doğum Tarihi' : 'Birth Date'}</label>
                <input
                  type="date"
                  className="pf-input"
                  value={birthDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
                {ageYears !== null && ageYears >= 0 && (
                  <p className="pf-age-hint">
                    {isTR ? `Yaşınız: ${ageYears}` : `Age: ${ageYears}`}
                  </p>
                )}
              </div>
              <div>
                <label className="pf-label">{isTR ? 'Telefon' : 'Phone'}</label>
                <input
                  type="text"
                  className="pf-input"
                  placeholder="+90 555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="pf-row">
              <div>
                <label className="pf-label">{isTR ? 'Ülke' : 'Country'}</label>
                <select
                  className="pf-select"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="">{isTR ? 'Ülke seçin' : 'Select country'}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="pf-label">{isTR ? 'Şehir' : 'City'}</label>
                <input
                  type="text"
                  className="pf-input"
                  placeholder={isTR ? 'İstanbul' : 'New York'}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="pf-btn" disabled={saving || uploadingAvatar}>
              {saving
                ? (isTR ? 'Kaydediliyor...' : 'Saving...')
                : (isTR ? 'Değişiklikleri Kaydet' : 'Save Changes')}
            </button>

            {success && (
              <div className="pf-toast success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {isTR ? 'Profil başarıyla güncellendi.' : 'Profile updated successfully.'}
              </div>
            )}

            {error && (
              <div className="pf-toast error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
