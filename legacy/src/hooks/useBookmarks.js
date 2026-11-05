import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export const useBookmarks = (session, showToast) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBookmarks = useCallback(async () => {
        if (!session?.user) {
            setBookmarks([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bookmarks')
                .select('*')
                .eq('user_id', session.user.id);

            if (error) throw error;
            setBookmarks(data || []);
        } catch (error) {
            showToast('Əlfəcinləri yükləmək mümkün olmadı.');
            console.error('Error fetching bookmarks:', error);
        } finally {
            setLoading(false);
        }
    }, [session, showToast]);

    useEffect(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    const toggleBookmark = useCallback(async (itemId, itemType) => {
        if (!session?.user) {
            showToast('Əlfəcin əlavə etmək üçün daxil olmalısınız.');
            return;
        }

        const isCurrentlyBookmarked = bookmarks.some(b => b.item_id === itemId && b.item_type === itemType);

        if (isCurrentlyBookmarked) {
            try {
                await supabase.from('bookmarks').delete().match({ item_id: itemId, item_type: itemType, user_id: session.user.id });
                setBookmarks(prev => prev.filter(b => !(b.item_id === itemId && b.item_type === itemType)));
                showToast('Əlfəcin silindi.');
            } catch (error) {
                showToast('Əlfəcini silmək mümkün olmadı.');
                console.error('Error removing bookmark:', error);
            }
        } else {
            try {
                const { data } = await supabase.from('bookmarks').insert({ item_id: itemId, item_type: itemType, user_id: session.user.id }).select().single();
                setBookmarks(prev => [...prev, data]);
                showToast('Əlfəcin əlavə edildi!');
            } catch (error) {
                showToast('Əlfəcini əlavə etmək mümkün olmadı.');
                console.error('Error adding bookmark:', error);
            }
        }
    }, [session, showToast, bookmarks]);

    const isBookmarked = (itemId, itemType) => {
        return bookmarks.some(b => b.item_id === itemId && b.item_type === itemType);
    };

    return { bookmarks, loading, toggleBookmark, isBookmarked };
};