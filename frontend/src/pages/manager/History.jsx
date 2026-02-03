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
    const [debouncedUserName, setDebouncedUserName] = useState("");
    const [viewingImage, setViewingImage] = useState(null);

    const [selectedRecord, setSelectedRecord] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedUserName(filters.user_name);
        }, 500);

        return () => clearTimeout(timer);
    }, [filters.user_name]);

    useEffect(() => {
        loadHistory();
    }, [pagination.page, filters.from_date, filters.to_date, debouncedUserName]);

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
                user_name: debouncedUserName,
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
        <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] space-y-4 transition-colors duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-secondary)] p-4 border border-[var(--border-color)] shadow-sm rounded-lg transition-colors duration-300">
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
            <div className="bg-transparent lg:bg-[var(--bg-secondary)] lg:rounded-2xl lg:shadow-md lg:border lg:border-[var(--border-color)] lg:overflow-hidden transition-colors duration-300">
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
                                            "Trạng thái",
                                            "Địa điểm",
                                            "Ghi chú",
                                            "Hành động",
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="px-6 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="">
                                    {records.map((r) => (
                                        <tr key={r.id} className="hover:bg-[var(--accent-color)]/10 even:bg-black/50 [.light_&]:even:bg-gray-50 border-b-2 border-slate-600 [.light_&]:border-slate-200 transition-colors duration-150 group">
                                            <td className="px-6 py-4 border-r border-slate-600 [.light_&]:border-slate-200">
                                                <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                                                    <Calendar size={16} className="text-[var(--text-secondary)]" />
                                                    {formatDate(r.day)}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 border-r border-slate-600 [.light_&]:border-slate-200">
                                                <div className="font-semibold text-[var(--text-primary)] tracking-wide">{r.user_name}</div>
                                            </td>

                                            <td className="px-6 py-4 text-sm whitespace-nowrap border-r border-slate-600 [.light_&]:border-slate-200">
                                                {getWorkStatusBadge(r.work_status)}
                                            </td>

                                            <td className="px-6 py-4 text-sm font-medium border-r border-slate-600 [.light_&]:border-slate-200">
                                                {r.checkin_type === 'FACTORY' ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-indigo-600 uppercase text-xs font-bold">Nhà máy</span>
                                                        <span className="text-[var(--text-primary)] text-xs">{r.factory_name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-blue-600 uppercase text-xs font-bold">Văn phòng</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-sm border-r border-slate-600 [.light_&]:border-slate-200 max-w-[250px] truncate" title={r.note}>
                                                {r.note ? (
                                                    <span className="text-[var(--text-primary)] italic">{r.note}</span>
                                                ) : (
                                                    <span className="text-[var(--text-secondary)]">-</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-sm border-r border-slate-600 [.light_&]:border-slate-200">
                                                 <button
                                                    onClick={() => setSelectedRecord(r)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent-color)] text-black hover:bg-[var(--accent-color)]/80 hover:scale-110 transition-all font-bold text-xs shadow-md active:scale-95"
                                                 >
                                                    <Eye size={14} />
                                                    Xem chi tiết
                                                 </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ===== MOBILE CARD VIEW ===== */}
                        <div className="lg:hidden space-y-3 bg-transparent">
                            {records.map((r) => (
                                <div
                                    key={r.id}
                                    className="p-4 space-y-4 bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] active:scale-[0.99] transition-all"
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
                                        <button
                                            onClick={() => setSelectedRecord(r)}
                                            className="px-3 py-1.5 bg-[var(--accent-color)] text-white rounded-lg text-xs font-bold shadow-sm"
                                        >
                                            Chi tiết
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border-color)]">
                                        <div className="flex items-center gap-2">
                                            <Briefcase size={14} className="text-[var(--text-secondary)]" />
                                            <span>Ca làm việc: </span>
                                            <span className="font-medium text-[var(--text-primary)]">{r.shift_name || "Chưa phân ca"}</span>
                                        </div>
                                        {r.note && (
                                            <div className="flex flex-col gap-1 pt-2 border-t border-[var(--border-color)]">
                                                <span className="text-[10px] font-bold uppercase">Ghi chú:</span>
                                                <span className="text-xs text-[var(--text-primary)] italic">{r.note}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                         {/* ===== DETAIL MODAL ===== */}
                        {selectedRecord && (
                            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="relative w-full max-w-2xl bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col max-h-[90vh]">
                                    {/* Modal Header */}
                                    <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                                        <div>
                                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center text-sm">
                                                     {selectedRecord.user_name?.charAt(0).toUpperCase()}
                                                </span>
                                                {selectedRecord.user_name}
                                            </h3>
                                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 ml-10">
                                                {formatDate(selectedRecord.day)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedRecord(null)}
                                            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] rounded-full transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Modal Body - Scrollable if needed */}
                                    <div className="p-4 overflow-y-auto custom-scrollbar">
                                        {/* Status & Info Grid */}
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Trạng thái</p>
                                                <div>{getWorkStatusBadge(selectedRecord.work_status)}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Địa điểm</p>
                                                {selectedRecord.checkin_type === 'FACTORY' ? (
                                                     <div className="font-bold text-indigo-500 text-sm">Nhà máy - {selectedRecord.factory_name}</div>
                                                ) : (
                                                     <div className="font-bold text-blue-500 text-sm">Văn phòng</div>
                                                )}
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                 <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Ca làm việc</p>
                                                 <p className="font-medium text-[var(--text-primary)] text-sm">{selectedRecord.shift_name || "Chưa phân ca"}</p>
                                            </div>
                                            {selectedRecord.note && (
                                                <div className="col-span-2 bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border-color)]">
                                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Ghi chú</p>
                                                    <p className="text-sm italic text-[var(--text-primary)]">"{selectedRecord.note}"</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Time & Images Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Check-in Column */}
                                            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                                                <div className="p-3 border-b border-[var(--border-color)] bg-emerald-500/5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-emerald-600 uppercase">Input (Check-in)</span>
                                                        <span className="font-mono text-lg font-bold text-[var(--text-primary)]">
                                                            {selectedRecord.checkin_time ? formatTime(selectedRecord.checkin_time) : "--:--"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    {selectedRecord.checkin_image ? (
                                                        <div 
                                                            className="aspect-video bg-black/50 rounded-lg overflow-hidden cursor-pointer group relative"
                                                            onClick={() => setViewingImage(selectedRecord.checkin_image)}
                                                        >
                                                            <img 
                                                                src={selectedRecord.checkin_image} 
                                                                alt="Checkin" 
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                 <Eye className="text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="aspect-video bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center text-[var(--text-secondary)] text-xs border border-dashed border-[var(--border-color)]">
                                                            Không có ảnh
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Check-out Column */}
                                            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                                                <div className="p-3 border-b border-[var(--border-color)] bg-orange-500/5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-orange-600 uppercase">Output (Check-out)</span>
                                                        <span className="font-mono text-lg font-bold text-[var(--text-primary)]">
                                                            {selectedRecord.checkout_time ? formatTime(selectedRecord.checkout_time) : "--:--"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    {selectedRecord.checkout_image ? (
                                                        <div 
                                                            className="aspect-video bg-black/50 rounded-lg overflow-hidden cursor-pointer group relative"
                                                            onClick={() => setViewingImage(selectedRecord.checkout_image)}
                                                        >
                                                            <img 
                                                                src={selectedRecord.checkout_image} 
                                                                alt="Checkout" 
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                 <Eye className="text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="aspect-video bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center text-[var(--text-secondary)] text-xs border border-dashed border-[var(--border-color)]">
                                                            Không có ảnh
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===== IMAGE ZOOM POPUP (Existing logic) ===== */}
                        {viewingImage && (
                            <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setViewingImage(null)}>
                                <div className="relative w-full max-w-6xl h-full max-h-[90vh] flex flex-col items-center justify-center">
                                    <button
                                        onClick={() => setViewingImage(null)}
                                        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 transition-colors z-10 bg-black/50 rounded-full"
                                    >
                                        <X size={32} />
                                    </button>

                                    <img
                                        src={viewingImage}
                                        alt="Zoom"
                                        className="w-full h-full object-contain rounded-lg shadow-2xl"
                                        onClick={(e) => e.stopPropagation()}
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
                                    className={`p-2 rounded-lg border border-[var(--border-color)] transition-all active:scale-95 ${
                                        pagination.page === 1
                                            ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                                            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--accent-color)] hover:border-[var(--accent-color)] cursor-pointer shadow-sm hover:shadow-md"
                                    }`}
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <button
                                    disabled={pagination.page === pagination.total_pages}
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    className={`p-2 rounded-lg border border-[var(--border-color)] transition-all active:scale-95 ${
                                        pagination.page === pagination.total_pages
                                            ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                                            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--accent-color)] hover:border-[var(--accent-color)] cursor-pointer shadow-sm hover:shadow-md"
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
