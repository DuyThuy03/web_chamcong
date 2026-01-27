import React, { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Eye, Filter, Search, X, Clock, User, Briefcase, CheckCircle2 } from "lucide-react";
import { formatDate, formatTime, isInDateRange } from "../../until/helper";
import api from "../../service/api";
import { wsService } from "../../service/ws";
import { useAuth } from "../../contexts/AuthContext";

const History = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0,
    });

    const [filters, setFilters] = useState({
        from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        to_date: new Date().toISOString().split("T")[0],
        user_name: "",
    });

    const [viewingImage, setViewingImage] = useState(null);

    useEffect(() => {
        loadHistory();
    }, [pagination.page, filters]);

    //ws checkout
    useEffect(() => {
        if (!user) return;

        const handleCheckin = (data) => {
            // ❗ chỉ xử lý khi record thuộc filter hiện tại
            if (!isInDateRange(data, filters)) return;

            setRecords((prev) => {
                // tránh trùng record
                const exists = prev.some((r) => r.id === data.id);
                if (exists) return prev;

                // chỉ prepend khi đang ở page 1
                if (pagination.page === 1) {
                    return [data, ...prev.slice(0, pagination.limit - 1)];
                }

                return prev;
            });

            // cập nhật tổng số bản ghi
            setPagination((prev) => ({
                ...prev,
                total: prev.total + 1,
            }));
        };

        wsService.on("ATTENDANCE_CHECKIN", handleCheckin);

        return () => {
            wsService.off("ATTENDANCE_CHECKIN", handleCheckin);
        };
    }, [user, filters, pagination.page]);

    //ws checkout
    useEffect(() => {
        if (!user) return;

        const handleCheckout = (data) => {
            // data = record sau khi checkout

            setRecords((prev) =>
                prev.map((r) => {
                    if (r.id !== data.id) return r;

                    return {
                        ...r,
                        checkout_time: data.checkout_time,
                        checkout_image: data.checkout_image,
                        work_status: data.work_status ?? r.work_status,
                        updated_at: data.updated_at,
                    };
                })
            );
        };

        wsService.on("ATTENDANCE_CHECKOUT", handleCheckout);

        return () => {
            wsService.off("ATTENDANCE_CHECKOUT", handleCheckout);
        };
    }, [user]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                ...filters,
                page: pagination.page,
                limit: pagination.limit,
            }).toString();
            console.log("QUERY:", query);
            const response = await api.get(`/attendance/history?${query}`, {
                method: "GET",
                credentials: "include",
            });

            const data = response.data;
            console.log("History response:", data);

            if (data.success) {
                setRecords(data.data);
                setPagination(data.pagination);
            }
        } catch (err) {
            console.error("Failed to load history:", err);
        } finally {
            setLoading(false);
        }
    };
    //click xem image
    const handleViewImage = (imageUrl) => {
        console.log("Viewing image:", imageUrl);
        setViewingImage(imageUrl);
    };

    const handlePageChange = (page) => {
        setPagination((prev) => ({ ...prev, page }));
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const getWorkStatusBadge = (status) => {
        const map = {
            ON_TIME: ["Đúng giờ", "bg-green-50 text-green-700 border-green-200 ring-green-600/20"],
            LATE: ["Đi muộn", "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20"],
            ABSENT: ["Vắng mặt", "bg-red-50 text-red-700 border-red-200 ring-red-600/20"],
        };

        if (!map[status]) return null;

        return (
            <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ring-1 ring-inset ${map[status][1]}`}
            >
                {map[status][0]}
            </span>
        );
    };

    return (
        <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 sm:px-6 lg:px-8 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] space-y-8 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-sm">
                            <Clock className="w-6 h-6 text-[var(--accent-color)]" />
                        </div>
                        LỊCH SỬ CHẤM CÔNG
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2 ml-14">
                        Theo dõi chi tiết thời gian làm việc hệ thống
                    </p>
                </div>
            </div>

            {/* ===== FILTER ===== */}
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-md border border-[var(--border-color)] p-5 transition-colors duration-300">
                <div className="flex items-center gap-2 mb-4 text-[var(--text-primary)] font-semibold border-b border-[var(--border-color)] pb-2">
                    <Filter size={18} className="text-[var(--accent-color)]" />
                    <h2 className="uppercase tracking-wider text-sm">Bộ lọc tìm kiếm</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide ml-1">Từ ngày</label>
                        <div className="relative">
                            <input
                                type="date"
                                name="from_date"
                                value={filters.from_date}
                                onChange={handleFilterChange}
                                className="w-full pl-4 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition-all text-base sm:text-sm font-medium text-[var(--text-primary)] appearance-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide ml-1">Đến ngày</label>
                        <div className="relative">
                            <input
                                type="date"
                                name="to_date"
                                value={filters.to_date}
                                onChange={handleFilterChange}
                                className="w-full pl-4 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition-all text-base sm:text-sm font-medium text-[var(--text-primary)] appearance-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide ml-1">
                            Tên nhân viên
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-[var(--text-secondary)]" />
                            </div>
                            <input
                                type="text"
                                name="user_name"
                                placeholder="Nhập tên nhân viên..."
                                value={filters.user_name}
                                onChange={handleFilterChange}
                                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition-all text-base sm:text-sm font-medium text-[var(--text-primary)] placeholder-gray-500 appearance-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== DATA ===== */}
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-md border border-[var(--border-color)] overflow-hidden transition-colors duration-300">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-color)] mb-4"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
                        <div className="w-16 h-16 bg-[var(--bg-primary)] rounded-full flex items-center justify-center mb-4 border border-[var(--border-color)]">
                            <Clock className="w-8 h-8 text-[var(--text-secondary)]" />
                        </div>
                        <p className="text-lg font-medium text-[var(--text-primary)]">Không có dữ liệu chấm công</p>
                        <p className="text-sm">Vui lòng thử lại với bộ lọc khác</p>
                    </div>
                ) : (
                    <>
                        {/* ===== DESKTOP TABLE ===== */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] text-[var(--text-secondary)]">
                                    <tr>
                                        {[
                                            "Ngày",
                                            "Nhân viên",
                                            "Ca làm việc",
                                            "Check-in",
                                            "Check-out",
                                            "Trạng thái",
                                            "Ảnh Check-in",
                                            "Ảnh Check-out",
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="px-6 py-4 text-xs font-bold uppercase tracking-wider"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {records.map((r) => (
                                        <tr key={r.id} className="hover:bg-[var(--bg-primary)] transition-colors duration-150 group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                                                    <Calendar size={16} className="text-[var(--text-secondary)]" />
                                                    {formatDate(r.day)}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-[var(--text-primary)] tracking-wide">{r.user_name}</div>
                                            </td>

                                            <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                                <div className="flex items-center gap-2">
                                                    <Briefcase size={14} className="text-[var(--text-secondary)]" />
                                                    {r.shift_name || "-"}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-sm font-bold text-[var(--accent-color)] tabular-nums">
                                                {r.checkin_time ? formatTime(r.checkin_time) : "-"}
                                            </td>

                                            <td className="px-6 py-4 text-sm font-bold text-purple-500 tabular-nums">
                                                {r.checkout_time ? formatTime(r.checkout_time) : "-"}
                                            </td>

                                            <td className="px-6 py-4">
                                                {getWorkStatusBadge(r.work_status)}
                                            </td>

                                            <td className="px-6 py-4">
                                                {r.checkin_image ? (
                                                    <button
                                                        onClick={() => handleViewImage(r.checkin_image)}
                                                        className="flex items-center gap-1 text-sm text-[var(--accent-color)] hover:text-cyan-300 font-medium hover:underline"
                                                    >
                                                        <Eye size={14} /> Xem ảnh
                                                    </button>
                                                ) : (
                                                    <span className="text-[var(--text-secondary)] text-sm">-</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                {r.checkout_image ? (
                                                    <button
                                                        onClick={() => handleViewImage(r.checkout_image)}
                                                        className="flex items-center gap-1 text-sm text-[var(--accent-color)] hover:text-cyan-300 font-medium hover:underline"
                                                    >
                                                        <Eye size={14} /> Xem ảnh
                                                    </button>
                                                ) : (
                                                    <span className="text-[var(--text-secondary)] text-sm">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ===== MOBILE CARD VIEW ===== */}
                        <div className="lg:hidden divide-y divide-[var(--border-color)] bg-[var(--bg-primary)]">
                            {records.map((r) => (
                                <div
                                    key={r.id}
                                    className="p-4 space-y-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] transition-colors border-b border-[var(--border-color)] last:border-0"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[var(--accent-color)] text-sm">
                                                {r.user_name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[var(--text-primary)]">{r.user_name}</div>
                                                <div className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                                                     <Calendar size={12} /> {formatDate(r.day)}
                                                </div>
                                            </div>
                                        </div>
                                        {getWorkStatusBadge(r.work_status)}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border-color)]">
                                            <span className="block text-xs text-[var(--accent-color)] font-semibold mb-1 uppercase">Check-in</span>
                                            <span className="text-lg font-bold text-[var(--text-primary)] tracking-widest">{r.checkin_time ? formatTime(r.checkin_time) : "--:--"}</span>
                                            {r.checkin_image && (
                                                <button
                                                    onClick={() => handleViewImage(r.checkin_image)}
                                                    className="block mt-2 text-xs text-[var(--accent-color)] font-medium hover:underline"
                                                >
                                                    Xem ảnh
                                                </button>
                                            )}
                                        </div>
                                        <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border-color)]">
                                             <span className="block text-xs text-purple-500 font-semibold mb-1 uppercase">Check-out</span>
                                            <span className="text-lg font-bold text-[var(--text-primary)] tracking-widest">{r.checkout_time ? formatTime(r.checkout_time) : "--:--"}</span>
                                            {r.checkout_image && (
                                                <button
                                                    onClick={() => handleViewImage(r.checkout_image)}
                                                    className="block mt-2 text-xs text-purple-400 font-medium hover:underline"
                                                >
                                                    Xem ảnh
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border-color)]">
                                        <Briefcase size={14} className="text-[var(--text-secondary)]" />
                                        <span>Ca làm việc: </span>
                                        <span className="font-medium text-[var(--text-primary)]">{r.shift_name || "Chưa phân ca"}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ===== IMAGE MODAL ===== */}
                        {viewingImage && (
                            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="relative w-full max-w-4xl bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-1">
                                    <button
                                        onClick={() => setViewingImage(null)}
                                        className="absolute -top-12 right-0 text-white/70 hover:text-white p-2 transition-colors"
                                    >
                                        <X size={24} />
                                    </button>

                                    <img
                                        src={viewingImage}
                                        alt="Check image"
                                        className="w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                                    />
                                </div>
                            </div>
                        )}

                        {/* ===== PAGINATION ===== */}
                        <div className="bg-[var(--bg-secondary)] px-4 sm:px-6 py-4 border-t border-[var(--border-color)] flex flex-col sm:flex-row gap-4 justify-between items-center transition-colors duration-300">
                            <p className="text-sm text-[var(--text-secondary)] order-2 sm:order-1">
                                Hiển thị <span className="font-bold text-[var(--text-primary)]">{(pagination.page - 1) * pagination.limit + 1}</span> đến <span className="font-bold text-[var(--text-primary)]">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> trong số <span className="font-bold text-[var(--text-primary)]">{pagination.total}</span> bản ghi
                            </p>

                            <div className="flex gap-2 order-1 sm:order-2">
                                <button
                                    disabled={pagination.page === 1}
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    className={`p-2 rounded-lg border border-[var(--border-color)] transition-all ${
                                        pagination.page === 1
                                            ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                                            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--accent-color)] hover:border-[var(--accent-color)] cursor-pointer shadow-sm"
                                    }`}
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <button
                                    disabled={pagination.page === pagination.total_pages}
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    className={`p-2 rounded-lg border border-[var(--border-color)] transition-all ${
                                        pagination.page === pagination.total_pages
                                            ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                                            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--accent-color)] hover:border-[var(--accent-color)] cursor-pointer shadow-sm"
                                    }`}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default History;
