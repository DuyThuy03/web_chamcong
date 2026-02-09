import { useEffect, useState } from "react";
import { Calendar, Building2, Loader2, FileSpreadsheet, Edit, Check, X } from "lucide-react";
import api from "../../service/api";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function ManagerDashboard() {
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [department, setDepartment] = useState("ALL");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null); 
  const [salaryInput, setSalaryInput] = useState("");

  const handleEditSalary = (item) => {
    setEditingSalary(item.user_id);
    const val = item.base_salary || 0;
    setSalaryInput(new Intl.NumberFormat('vi-VN').format(val));
  };

  const handleSaveSalary = async () => {
    if (!editingSalary) return;
    try {
        const rawValue = parseFloat(salaryInput.replace(/[^0-9]/g, ''));
        
        await api.put(`/manager/members/${editingSalary}`, {
            base_salary: rawValue
        });
        setData(data.map(d => d.user_id === editingSalary ? { ...d, base_salary: rawValue } : d));
        setEditingSalary(null);
        fetchSummary(); 
    } catch (err) {
        console.error("Failed to update salary", err);
        alert("Cập nhật lương thất bại: " + (err.response?.data?.error || err.message));
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = { month };
      const res = await api.get(
        "/manager/attendance/monthly-summary",
        { params }
      );
      console.log("Thuy",res.data.data);
      setData(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [month]);

  const filteredData =
    department === "ALL"
      ? data
      : data.filter((d) => d.department_name === department);

  const departments = [
    "ALL",
    ...new Set(data.map((d) => d.department_name)),
  ];

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bảng Công");
    
    // Parse month
    const [year, monthNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    
    // Generate dates array
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
        dates.push(new Date(year, monthNum - 1, i));
    }

    // Set columns width
    const colWidths = [5, 12, 8, 30]; 
    for (let i = 0; i < daysInMonth; i++) colWidths.push(5); 
    colWidths.push(8, 20); 
    
    sheet.columns = colWidths.map(w => ({ width: w }));

    // --- ROW 1: Month Header ---
    sheet.mergeCells(1, 1, 1, 4 + daysInMonth + 2);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `Tháng   ${monthNum}   Năm   ${year}`;
    titleCell.font = { bold: true, size: 14, fontFamily: "Times New Roman" };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } }; // Yellow

    
    const staticHeaders = ["TT", "Mã nhân viên", "Mã chi phí", "Họ và tên"];
    staticHeaders.forEach((h, i) => {
        const col = i + 1;
        sheet.mergeCells(2, col, 3, col);
        const cell = sheet.getCell(2, col);
        cell.value = h;
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    dates.forEach((date, i) => {
        const col = 5 + i;
        const day = date.getDate().toString().padStart(2, '0');
        const dayOfWeek = date.getDay(); // 0 is Sunday
        const dayName = dayOfWeek === 0 ? "CN" : `Thứ\n${dayOfWeek + 1}`;
        
        // Day number row
        const cellDay = sheet.getCell(2, col);
        cellDay.value = day;
        cellDay.font = { bold: true };
        cellDay.alignment = { horizontal: "center", vertical: "middle" };
        cellDay.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
         cellDay.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

        // Day name row
        const cellName = sheet.getCell(3, col);
        cellName.value = dayName;
        cellName.font = { bold: true, size: 9 };
        cellName.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        
        // Highlight Sunday column header in row 3
        if (dayOfWeek === 0) {
             cellName.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0000" } }; // Red
             cellName.font = { bold: true, color: { argb: 'FFFFFF' } };
        } else {
             cellName.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
        }
        cellName.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    // Total and Note
    // Merge vertical
    const suffixHeaders = ["Tổng cộng", "Ghi chú"];
    suffixHeaders.forEach((h, i) => {
        const col = 5 + daysInMonth + i;
         sheet.mergeCells(2, col, 3, col);
        const cell = sheet.getCell(2, col);
        cell.value = h;
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });


    // --- DATA ROWS ---
    let currentRow = 4;
    
    filteredData.forEach((item, index) => {
        const dailyDetails = item.daily_details || {};
        const userId = item.user_id;

        // --- ROW A: Main Info (Green) ---
        // TT
        sheet.getCell(currentRow, 1).value = index + 1;
        // Ma NV
        sheet.getCell(currentRow, 2).value = "NV" + item.user_id;
        // Ma Chi Phi
        sheet.getCell(currentRow, 3).value = "NC";
        // Name
        sheet.getCell(currentRow, 4).value = `${item.user_name} (${item.department_name})`;
        
        // Style Row A
        for(let c=1; c<=4; c++) {
            const cell = sheet.getCell(currentRow, c);
            cell.font = { bold: true };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "92D050" } }; // Green like screenshot
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.alignment = { vertical: 'middle', wrapText: true };
        }

        let totalPoints = 0;
        
        // Days
        dates.forEach((date, i) => {
            const col = 5 + i;
            
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const dStr = String(date.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${dStr}`;

            const detail = dailyDetails[dateStr] || {};
            const cell = sheet.getCell(currentRow, col);
            
          
            if (detail.work_unit !== undefined && detail.work_unit !== null && detail.work_unit > 0) {
                 cell.value = detail.work_unit;
            } else if (detail.leave_type) {
                if (detail.is_paid_leave) {
                    cell.value = 1;
                } else {
                     cell.value = "";
                }
            } else {
                cell.value = "";
            }
            
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            
            
            if (date.getDay() === 0) {
                 cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0000" } };
            } else {
                 cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "92D050" } }; // Green
            }
        });

        // Total Work Days (Standard + Paid Leave)
        const cellTotal = sheet.getCell(currentRow, 5 + daysInMonth);
        const totalWork = (item.total_standard_work_days || 0) + (item.total_paid_leave_days || 0);
        cellTotal.value = totalWork; 
        cellTotal.font = { bold: true };
        cellTotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "92D050" } };
        cellTotal.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
         cellTotal.alignment = { horizontal: "center", vertical: "middle" };

        sheet.getCell(currentRow, 5 + daysInMonth + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "92D050" } }; // Note

        currentRow++;

        // --- ROW B: Overtime ---
         sheet.getCell(currentRow, 3).value = "LT";
         sheet.getCell(currentRow, 4).value = "Tăng ca (giờ)";
         
         dates.forEach((date, i) => {
            const col = 5 + i;
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const dStr = String(date.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${dStr}`;

            const detail = dailyDetails[dateStr] || {};
            const cell = sheet.getCell(currentRow, col);
            
            // Use weighted OT if available
            const otVal = detail.ot_hours_weighted || 0;
            if (otVal > 0) {
                cell.value = otVal;
            }
            
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            
             if (date.getDay() === 0) {
                 cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0000" } };
            }
         });
         
         // Use total OT from API (converted from backend usually if weighted is standard)
         // But `total_ot_hours` from API in MonthlySummaryResponse is usually RAW or Weighted?
         // In `attendance_repo.go`, `total_ot_hours` maps to `TotalOTHours` (Query: `SUM(total_hours * ...)` weighted).
         // So it is already weighted.
         sheet.getCell(currentRow, 5 + daysInMonth).value = item.total_ot_hours || 0;
         
         // Style partial row
         sheet.getCell(currentRow, 5 + daysInMonth).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
         sheet.getCell(currentRow, 5 + daysInMonth).alignment = { horizontal: "center", vertical: "middle" };
        // Apply borders/style for static columns
         for(let c=1; c<=4; c++) {
              sheet.getCell(currentRow, c).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
         }
         
         currentRow++;

         // --- ROW C: Travel/Note ---
         sheet.getCell(currentRow, 3).value = "DL";
         sheet.getCell(currentRow, 4).value = "Đi nhà máy bằng xe máy ( km) - note rõ đi đâu?cho dự án nào?";
         sheet.getCell(currentRow, 4).alignment = { wrapText: true, vertical: 'middle' };

          dates.forEach((date, i) => {
            const col = 5 + i;
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const dStr = String(date.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${dStr}`;
            
            const detail = dailyDetails[dateStr] || {};
            const cell = sheet.getCell(currentRow, col);
            
            // Logic for what to show here: FactoryName or CheckinType?
            if (detail.checkin_type === "FACTORY" && detail.factory_name) {
                 cell.value = detail.factory_name;
            }
             
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, size: 8 };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            
             if (date.getDay() === 0) {
                 cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0000" } };
            }
         });
          // Style partial row
          sheet.getCell(currentRow, 5 + daysInMonth).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
           for(let c=1; c<=4; c++) {
              sheet.getCell(currentRow, c).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
         }
         
         currentRow++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Bang_Cong_${month}.xlsx`);
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] space-y-4 transition-colors duration-200">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--bg-secondary)] p-4 border border-[var(--border-color)] shadow-sm rounded-lg transition-colors">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] uppercase tracking-tight">
            Tổng hợp chấm công
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Thống kê chi tiết chấm công nhân viên theo tháng
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExport}
            disabled={loading || filteredData.length === 0}
            className="flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Xuất Excel
          </button>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-blue-500 transition-colors" />
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-base sm:text-sm rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all dark:[color-scheme:dark] appearance-none"
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-blue-500 transition-colors" />
            </div>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="block w-full pl-9 pr-9 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-base sm:text-sm rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-all cursor-pointer"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "ALL" ? "Tất cả phòng ban" : d}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
          <p className="text-sm font-medium">Đang tải dữ liệu...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-center px-4">
          <div className="w-12 h-12 bg-[var(--bg-primary)] flex items-center justify-center mb-3 rounded-md">
            <Calendar className="w-6 h-6 text-[var(--text-secondary)]" />
          </div>
          <h3 className="text-base font-medium text-[var(--text-primary)]">Không có dữ liệu</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm">
            Không tìm thấy dữ liệu chấm công cho tháng và phòng ban đã chọn.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--bg-primary)] text-white [.light_&]:text-gray-700 font-semibold border-b-2 border-slate-600 [.light_&]:border-slate-200 uppercase text-xs tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 border-r border-slate-600 [.light_&]:border-slate-200">Nhân viên</th>
                    <th className="px-4 py-4 border-r border-slate-600 [.light_&]:border-slate-200">Phòng ban</th>
                    <th className="px-4 py-4 text-center border-r border-slate-600 [.light_&]:border-slate-200">Công chuẩn</th>
                    <th className="px-4 py-4 text-center border-r border-slate-600 [.light_&]:border-slate-200">OT (Giờ)</th>
                    <th className="px-4 py-4 text-center border-r border-slate-600 [.light_&]:border-slate-200">Phép (Ngày)</th>
                    <th className="px-4 py-4 text-center border-r border-slate-600 [.light_&]:border-slate-200">Tổng công</th>
                     <th className="px-4 py-4 text-right border-r border-slate-600 [.light_&]:border-slate-200">Lương CB</th>
                     <th className="px-4 py-4 text-right border-r border-slate-600 [.light_&]:border-slate-200">Lương OT</th>
                     <th className="px-4 py-4 text-right border-r border-slate-600 [.light_&]:border-slate-200">Thực Lãnh</th>
                    <th className="px-4 py-4 text-center border-r border-slate-600 [.light_&]:border-slate-200">Nghỉ KP</th>
                    <th className="px-4 py-4 text-center">Đi trễ</th>
                  </tr>
                </thead>
                <tbody className="">
                  {filteredData.map((item) => (
                    <tr
                      key={item.user_id}
                      className="hover:bg-[var(--accent-color)]/10 even:bg-black/50 [.light_&]:even:bg-gray-50 border-b-2 border-slate-600 [.light_&]:border-slate-200 transition-colors duration-150"
                    >
                      <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                        <div className="font-semibold text-[var(--text-primary)]">{item.user_name}</div>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md">
                          {item.department_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-slate-600 [.light_&]:border-slate-200">
                        <span className="font-bold text-[var(--text-primary)]">
                          {item.total_standard_work_days}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-slate-600 [.light_&]:border-slate-200">
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          {item.total_ot_hours}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-slate-600 [.light_&]:border-slate-200">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {item.total_paid_leave_days}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-slate-600 [.light_&]:border-slate-200">
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {item.total_work_days}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right border-r border-slate-600 [.light_&]:border-slate-200">
                        {editingSalary === item.user_id ? (
                            <div className="flex items-center justify-end gap-1">
                                <input 
                                    type="text" 
                                    value={salaryInput} 
                                    onChange={(e) => {
                                        // Allow only numbers and dots/commas
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        // Format for display (e.g. 10.000.000)
                                        const formatted = new Intl.NumberFormat('vi-VN').format(val);
                                        setSalaryInput(formatted === '0' && val === '' ? '' : formatted);
                                    }}
                                    placeholder="Nhập lương..."
                                    className="w-28 px-1 py-1 text-right text-gray-900 bg-white rounded border border-blue-500 focus:outline-none text-sm"
                                    autoFocus
                                />
                                <button onClick={handleSaveSalary} className="text-green-500 hover:text-green-600 p-1 rounded hover:bg-green-500/10"><Check size={16} /></button>
                                <button onClick={() => setEditingSalary(null)} className="text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-500/10"><X size={16} /></button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-end gap-2 group">
                                <span className="font-medium text-[var(--text-primary)]">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.base_salary)}
                                </span>
                                <button 
                                    onClick={() => handleEditSalary(item)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-600 p-1 rounded hover:bg-blue-500/10"
                                    title="Cập nhật lương"
                                >
                                    <Edit size={14} />
                                </button>
                            </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right border-r border-slate-600 [.light_&]:border-slate-200">
                        <span className="font-medium text-orange-600">
                             {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_ot_salary)}
                        </span>
                      </td>
                       <td className="px-4 py-3 text-right border-r border-slate-600 [.light_&]:border-slate-200">
                        <span className="font-bold text-green-600">
                             {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_salary)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center border-r border-slate-600 [.light_&]:border-slate-200">
                        {item.absent_days > 0 ? (
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {item.absent_days}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)] opacity-50">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                         {item.late_days > 0 ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                             {item.late_days}
                          </span>
                        ) : (
                           <span className="text-[var(--text-secondary)] opacity-50">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredData.map((item) => (
              <div
                key={item.user_id}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 space-y-3 hover:shadow-md transition-all rounded-lg active:scale-[0.99]"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-base uppercase">{item.user_name}</h3>
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 text-xs font-medium bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md">
                      {item.department_name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {item.total_work_days}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase">Tổng công</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-[var(--border-color)]">
                  <div className="flex flex-col items-center p-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium mb-1 uppercase">Chuẩn</span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">{item.total_standard_work_days}</span>
                  </div>
                  <div className="flex flex-col items-center p-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium mb-1 uppercase">OT</span>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{item.total_ot_hours}</span>
                  </div>
                  <div className="flex flex-col items-center p-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium mb-1 uppercase">Phép</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.total_paid_leave_days}</span>
                  </div>
                  <div className="flex flex-col items-center p-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium mb-1 uppercase">KP</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{item.absent_days}</span>
                  </div>
                  <div className="flex flex-col items-center p-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium mb-1 uppercase">Trễ</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{item.late_days}</span>
                  </div>
                </div>

                {/* Salary Info Mobile */}
                <div className="pt-2 border-t border-[var(--border-color)] space-y-1">
                   <div className="flex justify-between text-xs">
                       <span className="text-[var(--text-secondary)]">Lương CB:</span>
                       <span className="font-medium text-[var(--text-primary)]">
                           {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.base_salary)}
                       </span>
                   </div>
                   <div className="flex justify-between text-xs">
                       <span className="text-[var(--text-secondary)]">Lương OT:</span>
                       <span className="font-medium text-orange-600">
                           {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_ot_salary)}
                       </span>
                   </div>
                   <div className="flex justify-between text-sm font-bold pt-1 border-t border-dashed border-[var(--border-color)]">
                       <span className="text-[var(--text-secondary)]">Thực Lãnh:</span>
                       <span className="text-green-600">
                           {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_salary)}
                       </span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
