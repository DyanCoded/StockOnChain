export default function LocalePicker({
  locale,
  label,
}: {
  locale: "en" | "zu";
  label: string;
}) {
  return (
    <div className="language-control">
      <label htmlFor="language">{label}</label>
      <select
        id="language"
        value={locale === "zu" ? "/zu" : "/"}
        data-locale-picker
      >
        <option value="/">English</option>
        <option value="/zu">isiZulu</option>
      </select>
    </div>
  );
}