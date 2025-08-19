import { useCases } from '../hooks/useCases';

export function CaseList() {
  const { cases, loading, error } = useCases();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-4">
      {cases.map((legalCase) => (
        <div key={legalCase.id} className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold">{legalCase.title}</h3>
          <p>Case Number: {legalCase.case_number}</p>
          <p>Status: {legalCase.status}</p>
          <p>Priority: {legalCase.priority}</p>
          <p>Practice Area: {legalCase.practice_area}</p>
          {legalCase.court_name && <p>Court: {legalCase.court_name}</p>}
          {legalCase.judge_name && <p>Judge: {legalCase.judge_name}</p>}
        </div>
      ))}
      {cases.length === 0 && (
        <p className="text-gray-500">No cases found.</p>
      )}
    </div>
  );
} 