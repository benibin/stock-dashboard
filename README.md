# Miri Stock Dashboard v5

גרסה חדשה להעלאה ידנית ל-GitHub/Vercel.

## מה נוסף
- ניתוח דינמי לכל טיקר שנתמך ב-Yahoo Finance, לא רק רשימה סגורה.
- Checkboxes: SMA50, SMA200, EMA20, EMA50, Bollinger Bands, Fibonacci, RSI, MACD, Volume, Risk/Reward, Position Size.
- Presets: Basic / Swing / Full Analysis.
- Entry / Stop / Target 1 / Target 2 מחושבים דינמית מ-ATR + תמיכה/התנגדות.
- Risk/Reward ויזואלי על הגרף.
- Position Size לפי סכום הסיכון שהמשתמש מזין.
- Dynamic AI Score שמכניס SMA/RSI/MACD/R:R לחישוב.
- API פנימי `/api/history` ו-`/api/quotes` כדי למנוע בעיות CORS ב-Preview.
- עדכון כמויות אחרונות: MU 4, SNDK 1, ORCL 25, MSTR 79, BMNR 210, ETHU 100; AMD הוסר לאחר מכירה.

## העלאה
1. חלץ את ה-ZIP.
2. העלה את כל התוכן לשורש ה-repository, כולל תיקיית `api`.
3. החלף את הקבצים הקיימים ובצע Commit.
4. Vercel אמור לפרוס אוטומטית מה-repository.

מומלץ קודם לבדוק Preview לפני Production.
