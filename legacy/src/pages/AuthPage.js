import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const AuthPage = ({ showToast }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [view, setView] = useState('login'); // 'login', 'register', 'forgot_password', 'check_email'

    const handleAuth = async (event) => {
        event.preventDefault();
        setLoading(true);

        if (view === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) showToast(error.error_description || error.message);
        } else if (view === 'register') {
            // Теперь мы просто создаем пользователя и передаем имя/фамилию в метаданные.
            // Триггер в базе данных сделает все остальное.
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                    }
                }
            });

            if (error) {
                showToast(error.error_description || error.message);
            } else {
                showToast('Qeydiyyat demək olar ki, tamamlandı!');
                setView('check_email');
            }
        }
        setLoading(false);
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/`,
        });
        if (error) {
            showToast(error.error_description || error.message);
        } else {
            showToast('Parolu sıfırlamaq üçün link emailinizə göndərildi!');
            setView('login');
        }
        setLoading(false);
    };

    const renderAuthForm = () => {
        if (view === 'check_email') {
            return (
                <div className="text-center space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800">Emailinizi yoxlayın</h2>
                    <p className="text-gray-600">
                        Qeydiyyatı tamamlamaq üçün sizə göndərilən təsdiq linkinə daxil olun.
                    </p>
                    <p className="text-sm text-gray-500">
                        Linkə daxil olduqdan sonra avtomatik olaraq sistemə daxil olacaqsınız.
                    </p>
                </div>
            );
        }

        if (view === 'forgot_password') {
            return (
                <form className="space-y-6" onSubmit={handlePasswordReset}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="email@example.com" />
                    </div>
                    <div>
                        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Göndərilir...' : 'Sıfırlama Linki Göndər'}</Button>
                    </div>
                </form>
            );
        }

        return (
            <form className="space-y-6" onSubmit={handleAuth}>
                {view === 'register' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ad</label>
                            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Adınızı daxil edin" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Soyad</label>
                            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Soyadınızı daxil edin" />
                        </div>
                    </>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="email@example.com" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Parol</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="••••••••" />
                </div>
                <div>
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Yüklənir...' : (view === 'login' ? 'Daxil Ol' : 'Qeydiyyatdan Keç')}</Button>
                </div>
            </form>
        );
    };

    const getTitle = () => {
        if (view === 'login') return 'Daxil Ol';
        if (view === 'register') return 'Qeydiyyat';
        if (view === 'check_email') return 'Bir Addım Qaldı!';
        return 'Parolu Sıfırla';
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-orange-50">
            <Card className="w-full max-w-md p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800">{getTitle()}</h1>
                </div>
                {renderAuthForm()}
                <div className="text-center text-sm">
                    {view === 'login' && <button onClick={() => setView('forgot_password')} className="font-medium text-orange-600 hover:underline">Parolu unutmusunuz?</button>}
                    {view === 'forgot_password' && <button onClick={() => setView('login')} className="font-medium text-orange-600 hover:underline">Giriş səhifəsinə qayıt</button>}
                </div>
                {view !== 'check_email' && (
                    <div className="text-center">
                        <button onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-sm text-orange-600 hover:underline">
                            {view === 'login' ? 'Hesabınız yoxdur? Qeydiyyatdan keçin' : 'Artıq hesabınız var? Daxil olun'}
                        </button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AuthPage;
