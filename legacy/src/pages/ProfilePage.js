import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ChartBarIcon, TrophyIcon } from '../assets/icons';
import AchievementIcon from '../components/ui/AchievementIcon';
import GamificationStats from '../components/GamificationStats';

const ProfilePage = ({ session, profile, showToast, onProfileUpdate, userAchievements, allAchievements }) => {
    const [loading, setLoading] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
        }
    }, [profile]);

    const { earned, unearned } = useMemo(() => {
        if (!allAchievements || !userAchievements) {
            return { earned: [], unearned: [] };
        }
        const earnedIds = new Set(userAchievements.map(a => a.achievement_id));
        const earned = allAchievements.filter(a => earnedIds.has(a.id));
        const unearned = allAchievements.filter(a => !earnedIds.has(a.id));
        return { earned, unearned };
    }, [allAchievements, userAchievements]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase
            .from('profiles')
            .update({
                first_name: firstName,
                last_name: lastName,
                username: `${firstName} ${lastName}`
            })
            .eq('id', session.user.id)
            .select()
            .single();

        if (error) {
            showToast(`Profil yenilənərkən xəta: ${error.message}`);
        } else {
            onProfileUpdate(data);
            showToast('Profil uğurla yeniləndi!');
        }
        setLoading(false);
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            showToast('Parollar eyni deyil!');
            return;
        }
        if (password.length < 6) {
            showToast('Parol ən azı 6 simvoldan ibarət olmalıdır.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            showToast(`Parol yenilənərkən xəta: ${error.message}`);
        } else {
            showToast('Parol uğurla yeniləndi!');
            setPassword('');
            setConfirmPassword('');
        }
        setLoading(false);
    };

    if (!session || !profile) {
        return <div>Yüklənir...</div>;
    }

    return (
        <div className="animate-fade-in space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Mənim Profilim</h1>
                <Link to={`/student/${session.user.id}`}>
                    <Button variant="primary"><ChartBarIcon /> Mənim Nəticələrim</Button>
                </Link>
            </div>

            {/* Gamification Stats */}
            <GamificationStats profile={profile} />

            <Card>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><TrophyIcon /> Qazanılmış Nailiyyətlər</h2>
                {earned.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                        {earned.map(ach => <AchievementIcon key={ach.id} achievement={ach} />)}
                    </div>
                ) : (
                    <p className="text-gray-500">Hələ heç bir nailiyyətiniz yoxdur. Testləri tamamlayın və ilkini qazanın!</p>
                )}
            </Card>

            <Card>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-500">Qazanılacaq Nailiyyətlər</h2>
                {unearned.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                        {unearned.map(ach => (
                            <div key={ach.id} className="grayscale opacity-60">
                                <AchievementIcon achievement={ach} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-green-600 font-semibold">Təbrik edirik! Bütün mümkün nailiyyətləri qazanmısınız!</p>
                )}
            </Card>

            <Card>
                <h2 className="text-xl font-bold mb-4">Şəxsi Məlumatlar</h2>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ad</label>
                            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Soyad</label>
                            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>{loading ? 'Yenilənir...' : 'Məlumatları Yenilə'}</Button>
                    </div>
                </form>
            </Card>

            <Card>
                <h2 className="text-xl font-bold mb-4">Parolu Dəyiş</h2>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Yeni Parol</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Yeni Parolu Təsdiqlə</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>{loading ? 'Dəyişilir...' : 'Parolu Dəyiş'}</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default ProfilePage;
