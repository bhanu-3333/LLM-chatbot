export default function SearchBar({ value, setValue }) {
  return (
    <input
      placeholder="Search patient"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}