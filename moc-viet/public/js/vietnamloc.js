/**
 * Vietnam Locations Data & Helper
 * Used for address selection in checkout forms.
 */
const vnLocations = {
    "Hồ Chí Minh": ["Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 10", "Quận 11", "Quận 12", "Quận Bình Tân", "Quận Bình Thạnh", "Quận Gò Vấp", "Quận Phú Nhuận", "Quận Tân Bình", "Quận Tân Phú", "Huyện Bình Chánh", "Huyện Cần Giờ", "Huyện Củ Chi", "Huyện Hóc Môn", "Huyện Nhà Bè", "TP. Thủ Đức"],
    "Hà Nội": ["Quận Ba Đình", "Quận Hoàn Kiếm", "Quận Tây Hồ", "Quận Long Biên", "Quận Cầu Giấy", "Quận Đống Đa", "Quận Hai Bà Trưng", "Quận Hoàng Mai", "Quận Thanh Xuân", "Quận Nam Từ Liêm", "Quận Bắc Từ Liêm", "Quận Hà Đông", "Thị xã Sơn Tây", "Huyện Ba Vì", "Huyện Chương Mỹ", "Huyện Đan Phượng", "Huyện Đông Anh", "Huyện Gia Lâm", "Huyện Hoài Đức", "Huyện Mê Linh", "Huyện Mỹ Đức", "Huyện Phú Xuyên", "Huyện Phúc Thọ", "Huyện Quốc Oai", "Huyện Sóc Sơn", "Huyện Thạch Thất", "Huyện Thanh Oai", "Huyện Thanh Trì", "Huyện Thường Tín", "Huyện Ứng Hòa"],
    "Đà Nẵng": ["Quận Hải Châu", "Quận Thanh Khê", "Quận Sơn Trà", "Quận Ngũ Hành Sơn", "Quận Liên Chiểu", "Quận Cẩm Lệ", "Huyện Hòa Vang", "Huyện Hoàng Sa"],
    "Hải Phòng": ["Quận Hồng Bàng", "Quận Ngô Quyền", "Quận Lê Chân", "Quận Hải An", "Quận Kiến An", "Quận Đồ Sơn", "Quận Dương Kinh", "Huyện Thuỷ Nguyên", "Huyện An Dương", "Huyện An Lão", "Huyện Tiên Lãng", "Huyện Vĩnh Bảo", "Huyện Cát Hải", "Huyện Bạch Long Vĩ"],
    "Cần Thơ": ["Quận Ninh Kiều", "Quận Bình Thuỷ", "Quận Cái Răng", "Quận Thốt Nốt", "Quận Ô Môn", "Huyện Phong Điền", "Huyện Cờ Đỏ", "Huyện Vĩnh Thạnh", "Huyện Thới Lai"],
    "An Giang": ["TP. Long Xuyên", "TP. Châu Đốc", "TX. Tân Châu", "TX. Tịnh Biên", "Huyện An Phú", "Huyện Châu Phú", "Huyện Châu Thành", "Huyện Chợ Mới", "Huyện Phú Tân", "Huyện Thoại Sơn", "Huyện Tri Tôn"],
    "Bà Rịa - Vũng Tàu": ["TP. Vũng Tàu", "TP. Bà Rịa", "TP. Phú Mỹ", "Huyện Châu Đức", "Huyện Côn Đảo", "Huyện Đất Đỏ", "Huyện Long Điền", "Huyện Xuyên Mộc"],
    "Bạc Liêu": ["TP. Bạc Liêu", "TX. Giá Rai", "Huyện Đông Hải", "Huyện Hòa Bình", "Huyện Hồng Dân", "Huyện Phước Long", "Huyện Vĩnh Lợi"],
    "Bắc Giang": ["TP. Bắc Giang", "TX. Việt Yên", "Huyện Hiệp Hòa", "Huyện Lạng Giang", "Huyện Lục Nam", "Huyện Lục Ngạn", "Huyện Sơn Động", "Huyện Tân Yên", "Huyện Yên Dũng", "Huyện Yên Thế"],
    "Bắc Kạn": ["TP. Bắc Kạn", "Huyện Ba Bể", "Huyện Bạch Thông", "Huyện Chợ Đồn", "Huyện Chợ Mới", "Huyện Na Rì", "Huyện Ngân Sơn", "Huyện Pác Nặm"],
    "Bắc Ninh": ["TP. Bắc Ninh", "TP. Từ Sơn", "TX. Quế Võ", "TX. Thuận Thành", "Huyện Gia Bình", "Huyện Lương Tài", "Huyện Tiên Du", "Huyện Yên Phong"],
    "Bến Tre": ["TP. Bến Tre", "Huyện Ba Tri", "Huyện Bình Đại", "Huyện Châu Thành", "Huyện Chợ Lách", "Huyện Giồng Trôm", "Huyện Mỏ Cày Bắc", "Huyện Mỏ Cày Nam", "Huyện Thạnh Phú"],
    "Bình Dương": ["TP. Thủ Dầu Một", "TP. Dĩ An", "TP. Thuận An", "TP. Tân Uyên", "TP. Bến Cát", "Huyện Bàu Bàng", "Huyện Dầu Tiếng", "Huyện Phú Giáo", "Huyện Bắc Tân Uyên"],
    "Bình Định": ["TP. Quy Nhơn", "TX. An Nhơn", "TX. Hoài Nhơn", "Huyện An Lão", "Huyện Hoài Ân", "Huyện Phù Cát", "Huyện Phù Mỹ", "Huyện Tây Sơn", "Huyện Tuy Phước", "Huyện Vân Canh", "Huyện Vĩnh Thạnh"],
    "Bình Phước": ["TP. Đồng Xoài", "TX. Bình Long", "TX. Phước Long", "TX. Chơn Thành", "Huyện Bù Đăng", "Huyện Bù Đốp", "Huyện Bù Gia Mập", "Huyện Đồng Phú", "Huyện Hớn Quản", "Huyện Lộc Ninh", "Huyện Phú Riềng"],
    "Bình Thuận": ["TP. Phan Thiết", "TX. La Gi", "Huyện Bắc Bình", "Huyện Đức Linh", "Huyện Hàm Thuận Bắc", "Huyện Hàm Thuận Nam", "Huyện Hàm Tân", "Huyện Phú Quý", "Huyện Tánh Linh", "Huyện Tuy Phong"],
    "Cà Mau": ["TP. Cà Mau", "Huyện Cái Nước", "Huyện Đầm Dơi", "Huyện Năm Căn", "Huyện Ngọc Hiển", "Huyện Phú Tân", "Huyện Thới Bình", "Huyện Trần Văn Thời", "Huyện U Minh"],
    "Cao Bằng": ["TP. Cao Bằng", "Huyện Bảo Lạc", "Huyện Bảo Lâm", "Huyện Hạ Lang", "Huyện Hà Quảng", "Huyện Hòa An", "Huyện Nguyên Bình", "Huyện Quảng Hòa", "Huyện Thạch An", "Huyện Trùng Khánh"],
    "Đắk Lắk": ["TP. Buôn Ma Thuột", "TX. Buôn Hồ", "Huyện Buôn Đôn", "Huyện Cư Kuin", "Huyện Cư M'gar", "Huyện Ea H'leo", "Huyện Ea Kar", "Huyện Ea Súp", "Huyện Krông Ana", "Huyện Krông Bông", "Huyện Krông Búk", "Huyện Krông Pắc", "Huyện Krông Năng", "Huyện Krông No", "Huyện Lắk", "Huyện M'Drắk"],
    "Đắk Nông": ["TP. Gia Nghĩa", "Huyện Cư Jút", "Huyện Đắk Glong", "Huyện Đắk Mil", "Huyện Đắk R'lấp", "Huyện Đắk Song", "Huyện Krông Nô", "Huyện Tuy Đức"],
    "Điện Biên": ["TP. Điện Biên Phủ", "TX. Mường Lay", "Huyện Điện Biên", "Huyện Điện Biên Đông", "Huyện Mường Ảng", "Huyện Mường Chà", "Huyện Mường Nhé", "Huyện Nậm Pồ", "Huyện Tủa Chùa", "Huyện Tuần Giáo"],
    "Đồng Nai": ["TP. Biên Hòa", "TP. Long Khánh", "Huyện Cẩm Mỹ", "Huyện Định Quán", "Huyện Long Thành", "Huyện Nhơn Trạch", "Huyện Tân Phú", "Huyện Thống Nhất", "Huyện Trảng Bom", "Huyện Vĩnh Cửu", "Huyện Xuân Lộc"],
    "Đồng Tháp": ["TP. Cao Lãnh", "TP. Sa Đéc", "TP. Hồng Ngự", "Huyện Cao Lãnh", "Huyện Châu Thành", "Huyện Hồng Ngự", "Huyện Lai Vung", "Huyện Lấp Vò", "Huyện Tam Nông", "Huyện Tân Hồng", "Huyện Thanh Bình", "Huyện Tháp Mười"],
    "Gia Lai": ["TP. Pleiku", "TX. An Khê", "TX. Ayun Pa", "Huyện Chư Păh", "Huyện Chư Prông", "Huyện Chư Pưh", "Huyện Chư Sê", "Huyện Đăk Đoa", "Huyện Đăk Pơ", "Huyện Đức Cơ", "Huyện Ia Grai", "Huyện Ia Pa", "Huyện Kông Chro", "Huyện Krông Pa", "Huyện Mang Yang", "Huyện Phú Thiện", "Huyện Kbang"],
    "Hà Giang": ["TP. Hà Giang", "Huyện Bắc Mê", "Huyện Bắc Quang", "Huyện Đồng Văn", "Huyện Hoàng Su Phì", "Huyện Mèo Vạc", "Huyện Quản Bạ", "Huyện Quang Bình", "Huyện Vị Xuyên", "Huyện Xín Mần", "Huyện Yên Minh"],
    "Hà Nam": ["TP. Phủ Lý", "TX. Duy Tiên", "TX. Kim Bảng", "Huyện Bình Lục", "Huyện Lý Nhân", "Huyện Thanh Liêm"],
    "Hà Tĩnh": ["TP. Hà Tĩnh", "TX. Hồng Lĩnh", "TX. Kỳ Anh", "Huyện Can Lộc", "Huyện Cẩm Xuyên", "Huyện Đức Thọ", "Huyện Hương Khê", "Huyện Hương Sơn", "Huyện Kỳ Anh", "Huyện Lộc Hà", "Huyện Nghi Xuân", "Huyện Thạch Hà", "Huyện Vũ Quang"],
    "Hải Dương": ["TP. Hải Dương", "TP. Chí Linh", "TX. Kinh Môn", "Huyện Bình Giang", "Huyện Cẩm Giàng", "Huyện Gia Lộc", "Huyện Kim Thành", "Huyện Nam Sách", "Huyện Ninh Giang", "Huyện Thanh Hà", "Huyện Thanh Miện", "Huyện Tứ Kỳ"],
    "Hậu Giang": ["TP. Vị Thanh", "TP. Ngã Bảy", "TX. Long Mỹ", "Huyện Châu Thành", "Huyện Châu Thành A", "Huyện Long Mỹ", "Huyện Phụng Hiệp", "Huyện Vị Thuỷ"],
    "Hoà Bình": ["TP. Hòa Bình", "Huyện Cao Phong", "Huyện Đà Bắc", "Huyện Kim Bôi", "Huyện Lạc Sơn", "Huyện Lạc Thủy", "Huyện Lương Sơn", "Huyện Mai Châu", "Huyện Tân Lạc", "Huyện Yên Thủy"],
    "Hưng Yên": ["TP. Hưng Yên", "TX. Mỹ Hào", "Huyện Ân Thi", "Huyện Khoái Châu", "Huyện Kim Động", "Huyện Phù Cừ", "Huyện Tiên Lữ", "Huyện Văn Giang", "Huyện Văn Lâm", "Huyện Yên Mỹ"],
    "Khánh Hòa": ["TP. Nha Trang", "TP. Cam Ranh", "TX. Ninh Hòa", "Huyện Cam Lâm", "Huyện Diên Khánh", "Huyện Khánh Sơn", "Huyện Khánh Vĩnh", "Huyện Trường Sa", "Huyện Vạn Ninh"],
    "Kiên Giang": ["TP. Rạch Giá", "TP. Hà Tiên", "TP. Phú Quốc", "Huyện An Biên", "Huyện An Minh", "Huyện Châu Thành", "Huyện Giang Thành", "Huyện Giồng Riềng", "Huyện Gò Quao", "Huyện Hòn Đất", "Huyện Kiên Hải", "Huyện Kiên Lương", "Huyện Tân Hiệp", "Huyện U Minh Thượng", "Huyện Vĩnh Thuận"],
    "Kon Tum": ["TP. Kon Tum", "Huyện Đắk Glei", "Huyện Đắk Hà", "Huyện Đắk Tô", "Huyện Ia H'Drai", "Huyện Kon Plông", "Huyện Kon Rẫy", "Huyện Ngọc Hồi", "Huyện Sa Thầy", "Huyện Tu Mơ Rông"],
    "Lai Châu": ["TP. Lai Châu", "Huyện Mường Tè", "Huyện Nậm Nhùn", "Huyện Phong Thổ", "Huyện Sìn Hồ", "Huyện Tam Đường", "Huyện Tân Uyên", "Huyện Than Uyên"],
    "Lâm Đồng": ["TP. Đà Lạt", "TP. Bảo Lộc", "Huyện Bảo Lâm", "Huyện Cát Tiên", "Huyện Di Linh", "Huyện Đạ Huoai", "Huyện Đạ Tẻh", "Huyện Đam Rông", "Huyện Đơn Dương", "Huyện Đức Trọng", "Huyện Lạc Dương", "Huyện Lâm Hà"],
    "Lạng Sơn": ["TP. Lạng Sơn", "Huyện Bắc Sơn", "Huyện Bình Gia", "Huyện Cao Lộc", "Huyện Chi Lăng", "Huyện Đình Lập", "Huyện Hữu Lũng", "Huyện Lộc Bình", "Huyện Tràng Định", "Huyện Văn Lãng", "Huyện Văn Quan"],
    "Lào Cai": ["TP. Lào Cai", "TX. Sa Pa", "Huyện Bắc Hà", "Huyện Bảo Thắng", "Huyện Bảo Yên", "Huyện Bát Xát", "Huyện Mường Khương", "Huyện Si Ma Cai", "Huyện Văn Bàn"],
    "Long An": ["TP. Tân An", "TX. Kiến Tường", "Huyện Bến Lức", "Huyện Cần Đước", "Huyện Cần Giuộc", "Huyện Châu Thành", "Huyện Đức Hòa", "Huyện Đức Huệ", "Huyện Mộc Hóa", "Huyện Tân Hưng", "Huyện Tân Thạnh", "Huyện Tân Trụ", "Huyện Thạnh Hóa", "Huyện Thủ Thừa", "Huyện Vĩnh Hưng"],
    "Nam Định": ["TP. Nam Định", "Huyện Giao Thủy", "Huyện Hải Hậu", "Huyện Mỹ Lộc", "Huyện Nam Trực", "Huyện Nghĩa Hưng", "Huyện Trực Ninh", "Huyện Vụ Bản", "Huyện Xuân Trường", "Huyện Ý Yên"],
    "Nghệ An": ["TP. Vinh", "TX. Cửa Lò", "TX. Thái Hòa", "TX. Hoàng Mai", "Huyện Anh Sơn", "Huyện Con Cuông", "Huyện Diễn Châu", "Huyện Đô Lương", "Huyện Hưng Nguyên", "Huyện Kỳ Sơn", "Huyện Nam Đàn", "Huyện Nghi Lộc", "Huyện Nghĩa Đàn", "Huyện Quế Phong", "Huyện Quỳ Châu", "Huyện Quỳ Hợp", "Huyện Quỳnh Lưu", "Huyện Tân Kỳ", "Huyện Thanh Chương", "Huyện Tương Dương", "Huyện Yên Thành"],
    "Ninh Bình": ["TP. Ninh Bình", "TP. Tam Điệp", "Huyện Gia Viễn", "Huyện Hoa Lư", "Huyện Kim Sơn", "Huyện Nho Quan", "Huyện Quỳnh Lưu", "Huyện Yên Khánh", "Huyện Yên Mô"],
    "Ninh Thuận": ["TP. Phan Rang-Tháp Chàm", "Huyện Bác Ái", "Huyện Ninh Hải", "Huyện Ninh Phước", "Huyện Ninh Sơn", "Huyện Thuận Bắc", "Huyện Thuận Nam"],
    "Phú Thọ": ["TP. Việt Trì", "TX. Phú Thọ", "Huyện Cẩm Khê", "Huyện Đoan Hùng", "Huyện Hạ Hòa", "Huyện Lâm Thao", "Huyện Phù Ninh", "Huyện Tam Nông", "Huyện Tân Sơn", "Huyện Thanh Ba", "Huyện Thanh Sơn", "Huyện Thanh Thủy", "Huyện Yên Lập"],
    "Phú Yên": ["TP. Tuy Hòa", "TX. Sông Cầu", "TX. Đông Hòa", "Huyện Đồng Xuân", "Huyện Phú Hòa", "Huyện Sơn Hòa", "Huyện Sông Hinh", "Huyện Tuy An", "Huyện Tây Hòa"],
    "Quảng Bình": ["TP. Đồng Hới", "TX. Ba Đồn", "Huyện Bố Trạch", "Huyện Lệ Thủy", "Huyện Minh Hóa", "Huyện Quảng Ninh", "Huyện Quảng Trạch", "Huyện Tuyên Hóa"],
    "Quảng Nam": ["TP. Tam Kỳ", "TP. Hội An", "TX. Điện Bàn", "Huyện Bắc Trà My", "Huyện Duy Xuyên", "Huyện Đại Lộc", "Huyện Đông Giang", "Huyện Hiệp Đức", "Huyện Nam Giang", "Huyện Nam Trà My", "Huyện Nông Sơn", "Huyện Núi Thành", "Huyện Phú Ninh", "Huyện Phước Sơn", "Huyện Quế Sơn", "Huyện Tây Giang", "Huyện Thăng Bình", "Huyện Tiên Phước"],
    "Quảng Ngãi": ["TP. Quảng Ngãi", "TX. Đức Phổ", "Huyện Ba Tơ", "Huyện Bình Sơn", "Huyện Lý Sơn", "Huyện Minh Long", "Huyện Mộ Đức", "Huyện Nghĩa Hành", "Huyện Sơn Hà", "Huyện Sơn Tây", "Huyện Sơn Tịnh", "Huyện Trà Bồng", "Huyện Tư Nghĩa"],
    "Quảng Ninh": ["TP. Hạ Long", "TP. Móng Cái", "TP. Cẩm Phả", "TP. Uông Bí", "TX. Quảng Yên", "TX. Đông Triều", "Huyện Vân Đồn", "Huyện Tiên Yên", "Huyện Hải Hà", "Huyện Đầm Hà", "Huyện Bình Liêu", "Huyện Ba Chẽ", "Huyện Cô Tô"],
    "Quảng Trị": ["TP. Đông Hà", "TX. Quảng Trị", "Huyện Cam Lộ", "Huyện Đảo Cồn Cỏ", "Huyện Đakrông", "Huyện Gio Linh", "Huyện Hải Lăng", "Huyện Hướng Hóa", "Huyện Triệu Phong", "Huyện Vĩnh Linh"],
    "Sóc Trăng": ["TP. Sóc Trăng", "TX. Vĩnh Châu", "TX. Ngã Năm", "Huyện Châu Thành", "Huyện Cù Lao Dung", "Huyện Kế Sách", "Huyện Long Phú", "Huyện Mỹ Tú", "Huyện Mỹ Xuyên", "Huyện Thạnh Trị", "Huyện Trần Đề"],
    "Sơn La": ["TP. Sơn La", "Huyện Bắc Yên", "Huyện Mai Sơn", "Huyện Mộc Châu", "Huyện Mường La", "Huyện Phù Yên", "Huyện Quỳnh Nhai", "Huyện Sông Mã", "Huyện Sốp Cộp", "Huyện Thuận Châu", "Huyện Vân Hồ", "Huyện Yên Châu"],
    "Tây Ninh": ["TP. Tây Ninh", "TX. Trảng Bàng", "TX. Hòa Thành", "Huyện Bến Cầu", "Huyện Châu Thành", "Huyện Dương Minh Châu", "Huyện Gò Dầu", "Huyện Tân Biên", "Huyện Tân Châu"],
    "Thái Bình": ["TP. Thái Bình", "Huyện Đông Hưng", "Huyện Hưng Hà", "Huyện Kiến Xương", "Huyện Quỳnh Phụ", "Huyện Thái Thụy", "Huyện Tiền Hải", "Huyện Vũ Thư"],
    "Thái Nguyên": ["TP. Thái Nguyên", "TP. Sông Công", "TP. Phổ Yên", "Huyện Đại Từ", "Huyện Định Hóa", "Huyện Đồng Hỷ", "Huyện Phú Bình", "Huyện Phú Lương", "Huyện Võ Nhai"],
    "Thanh Hóa": ["TP. Thanh Hóa", "TP. Sầm Sơn", "TX. Bỉm Sơn", "TX. Nghi Sơn", "Huyện Bá Thước", "Huyện Cẩm Thủy", "Huyện Đông Sơn", "Huyện Hà Trung", "Huyện Hậu Lộc", "Huyện Hồi Xuân", "Huyện Hoằng Hóa", "Huyện Lang Chánh", "Huyện Mường Lát", "Huyện Nga Sơn", "Huyện Ngọc Lặc", "Huyện Như Thanh", "Huyện Như Xuân", "Huyện Nông Cống", "Huyện Quan Hóa", "Huyện Quan Sơn", "Huyện Quảng Xương", "Huyện Thạch Thành", "Huyện Thiệu Hóa", "Huyện Thọ Xuân", "Huyện Thường Xuân", "Huyện Triệu Sơn", "Huyện Vĩnh Lộc", "Huyện Yên Định"],
    "Thừa Thiên Huế": ["TP. Huế", "TX. Hương Thủy", "TX. Hương Trà", "Huyện A Lưới", "Huyện Nam Đông", "Huyện Phong Điền", "Huyện Phú Lộc", "Huyện Phú Vang", "Huyện Quảng Điền"],
    "Tiền Giang": ["TP. Mỹ Tho", "TX. Gò Công", "TX. Cai Lậy", "Huyện Cái Bè", "Huyện Châu Thành", "Huyện Chợ Gạo", "Huyện Gò Công Đông", "Huyện Gò Công Tây", "Huyện Tân Phú Đông", "Huyện Tân Phước"],
    "Trà Vinh": ["TP. Trà Vinh", "TX. Duyên Hải", "Huyện Càng Long", "Huyện Cầu Kè", "Huyện Cầu Ngang", "Huyện Châu Thành", "Huyện Duyên Hải", "Huyện Tiểu Cần", "Huyện Trà Cú"],
    "Tuyên Quang": ["TP. Tuyên Quang", "Huyện Chiêm Hóa", "Huyện Hàm Yên", "Huyện Lâm Bình", "Huyện Na Hang", "Huyện Sơn Dương", "Huyện Yên Sơn"],
    "Vĩnh Long": ["TP. Vĩnh Long", "TX. Bình Minh", "Huyện Bình Tân", "Huyện Long Hồ", "Huyện Mang Thít", "Huyện Tam Bình", "Huyện Trà Ôn", "Huyện Vũng Liêm"],
    "Vĩnh Phúc": ["TP. Vĩnh Yên", "TP. Phúc Yên", "Huyện Bình Xuyên", "Huyện Lập Thạch", "Huyện Sông Lô", "Huyện Tam Đảo", "Huyện Tam Dương", "Huyện Vĩnh Tường", "Huyện Yên Lạc"],
    "Yên Bái": ["TP. Yên Bái", "TX. Nghĩa Lộ", "Huyện Lục Yên", "Huyện Mù Cang Chải", "Huyện Trạm Tấu", "Huyện Trạm Tấu", "Huyện Trấn Yên", "Huyện Văn Chấn", "Huyện Văn Yên", "Huyện Yên Bình"]
};

function initVietnamLoc(provinceId, districtId) {
    const provinceEl = document.getElementById(provinceId);
    const districtEl = document.getElementById(districtId);
    
    if (!provinceEl || !districtEl) return;

    // Clear existing
    provinceEl.innerHTML = '<option value="">-- Chọn Tỉnh/Thành phố --</option>';
    districtEl.innerHTML = '<option value="">-- Chọn Quận/Huyện --</option>';

    // Sort provinces alphabetically
    const provinces = Object.keys(vnLocations).sort((a, b) => a.localeCompare(b, 'vi'));

    provinces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        provinceEl.appendChild(opt);
    });

    provinceEl.onchange = function() {
        const selected = this.value;
        districtEl.innerHTML = '<option value="">-- Chọn Quận/Huyện --</option>';
        
        if (selected && vnLocations[selected]) {
            const districts = vnLocations[selected].sort((a, b) => a.localeCompare(b, 'vi'));
            districts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                districtEl.appendChild(opt);
            });
        }
    };
}
