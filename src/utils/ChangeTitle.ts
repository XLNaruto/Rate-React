import { useEffect } from 'react';

// Title Change While Page Changes
export const ChangeTitle = (title: string) => {
  useEffect(() => {
    document.title = 'Rate + React | ' + title;
  }, [title]);
};