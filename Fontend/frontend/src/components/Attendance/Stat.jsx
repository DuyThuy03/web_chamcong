const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
};

export default function Stat({ title, value, color = "blue" }) {
  return (
    <div className="rounded-xl p-4 bg-gray-50">
      <p className="text-xs text-gray-500">{title}</p>
      <p className={`text-xl font-bold ${colorMap[color]}`}>
        {value}
      </p>
    </div>
  );
}
