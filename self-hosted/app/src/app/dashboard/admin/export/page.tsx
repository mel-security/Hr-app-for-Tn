'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';

export default function AdminExportPage() {
  const [loading, setLoading] = useState('');

  async function doExport(type: string) {
    setLoading(type);
    const res = await fetch(`/api/admin/export?type=${type}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setLoading('');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Export des données</h1>
        <p className="text-gray-500 mt-1">Téléchargez les données au format CSV</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { type: 'demandes', title: 'Demandes', desc: 'Export complet de toutes les demandes.' },
          { type: 'echeances', title: 'Échéances', desc: 'Toutes les échéances de remboursement.' },
          { type: 'employes', title: 'Employés', desc: 'Liste des employés avec salaires et plafonds.' },
        ].map((item) => (
          <Card key={item.type}>
            <CardHeader><CardTitle>{item.title}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{item.desc}</p>
              <Button onClick={() => doExport(item.type)} loading={loading === item.type} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />Exporter
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
