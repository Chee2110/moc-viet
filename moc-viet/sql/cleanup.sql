-- ══════════════════════════════════════════════════
--  XÓA DỮ LIỆU TEST — GIỮ LẠI TÀI KHOẢN ADMIN
--  Chạy: psql -U postgres -d mocviet -f sql/cleanup.sql
-- ══════════════════════════════════════════════════

BEGIN;

-- 1. Xóa theo thứ tự phụ thuộc khóa ngoại
DELETE FROM notifications;
DELETE FROM cart_items;
DELETE FROM favorites;
DELETE FROM deals;
DELETE FROM orders;
DELETE FROM products;
DELETE FROM shops;
DELETE FROM users WHERE email != 'dinhhchi2110@gmail.com';

-- 2. Reset sequence về 1 (trừ users giữ lại sau ID admin)
ALTER SEQUENCE notifications_id_seq  RESTART WITH 1;
ALTER SEQUENCE cart_items_id_seq      RESTART WITH 1;
ALTER SEQUENCE favorites_id_seq       RESTART WITH 1;
ALTER SEQUENCE deals_id_seq           RESTART WITH 1;
ALTER SEQUENCE orders_id_seq          RESTART WITH 1;
ALTER SEQUENCE products_id_seq        RESTART WITH 1;
ALTER SEQUENCE shops_id_seq           RESTART WITH 1;

-- Reset users sequence bắt đầu sau ID hiện tại của admin
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

COMMIT;

-- Kiểm tra kết quả
SELECT 'users'         AS bang, COUNT(*) AS con_lai FROM users
UNION ALL
SELECT 'shops',         COUNT(*) FROM shops
UNION ALL
SELECT 'products',      COUNT(*) FROM products
UNION ALL
SELECT 'orders',        COUNT(*) FROM orders
UNION ALL
SELECT 'deals',         COUNT(*) FROM deals
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'cart_items',    COUNT(*) FROM cart_items
UNION ALL
SELECT 'favorites',     COUNT(*) FROM favorites;
