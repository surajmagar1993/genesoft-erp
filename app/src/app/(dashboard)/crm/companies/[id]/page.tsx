export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div>Company details for {params.id} coming soon...</div>
      </div>
  );
}
