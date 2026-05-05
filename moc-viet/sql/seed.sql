-- ══════════════════════════════════════════════════
--  MỘC VIỆT — Seed data (chạy 1 lần khi DB trống)
--  Mật khẩu được hash bởi database.js trước khi INSERT
-- ══════════════════════════════════════════════════

-- Cấu trúc seed (thực tế được chạy từ database.js vì cần bcrypt hash)
-- File này chỉ để tham khảo logic seed data

-- users:
--   admin@mocviet.vn  / admin123   role=admin
--   seller@mocviet.vn / seller123  role=seller
--   seller2@mocviet.vn/ seller123  role=seller (shop đang chờ duyệt)

-- shops:
--   'Mộc Việt Handmade'   → approved  (thuộc seller@mocviet.vn)
--   'Gốm Sứ Bình Dương'   → pending   (thuộc seller2@mocviet.vn)

-- products (thuộc shop Mộc Việt Handmade):
--   Kệ sách gỗ tre tự nhiên       450,000đ
--   Hộp đựng trang sức gỗ mít     280,000đ
--   Bộ chén bát gốm thủ công      320,000đ
--   Ấm trà tre xanh tự nhiên      350,000đ
--   Lọ hoa gỗ hương khắc tay      185,000đ
--   Tranh gỗ phong cảnh Việt Nam  650,000đ
