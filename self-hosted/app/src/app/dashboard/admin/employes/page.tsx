'use client';

import { useAuth } from '@/hooks/useAuth';
import { formatMontant } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { User } from '@/types';
import { useEffect, useState } from 'react';

export default function AdminEmployesPage() {
  const { user, isAdmin } = useAuth();
  const [employes, setEmployes] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSalaire, setEditSalaire] = useState('');
  const [editPlafond, setEditPlafond] = useState('');
  const [editMatricule, setEditMatricule] = useState('');
  const [editDept, setEditDept] = useState('');

  function loadEmployes() {
    fetch('/api/admin/employes').then(r => r.json()).then(d => {
      setEmployes(d.employes || []);
      setLoading(false);
    });
  }

  useEffect(() => { if (user && isAdmin) loadEmployes(); }, [user, isAdmin]);

  async function handleSave(id: string) {
    await fetch('/api/admin/employes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, salaire_net: editSalaire, plafond_credit: editPlafond, matricule: editMatricule, departement: editDept }),
    });
    setEditingId(null);
    loadEmployes();
  }

  function startEdit(emp: User) {
    setEditingId(emp.id);
    setEditSalaire(String(emp.salaire_net));
    setEditPlafond(String(emp.plafond_credit));
    setEditMatricule(emp.matricule || '');
    setEditDept(emp.departement || '');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des employés</h1>
        <p className="text-gray-500 mt-1">Configurez les salaires et plafonds de crédit</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          : employes.length === 0 ? <p className="text-gray-500 text-sm py-8 text-center">Aucun employé</p>
          : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-medium text-gray-500">Nom</th>
              <th className="text-left py-3 px-2 font-medium text-gray-500">Email</th>
              <th className="text-left py-3 px-2 font-medium text-gray-500">Matricule</th>
              <th className="text-left py-3 px-2 font-medium text-gray-500">Département</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">Salaire</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">Plafond</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">Actions</th>
            </tr></thead><tbody>
              {employes.map((emp) => editingId === emp.id ? (
                <tr key={emp.id} className="border-b border-gray-100">
                  <td className="py-3 px-2 font-medium">{emp.prenom} {emp.nom}</td>
                  <td className="py-3 px-2 text-gray-500">{emp.email}</td>
                  <td className="py-3 px-2"><Input value={editMatricule} onChange={(e) => setEditMatricule(e.target.value)} className="w-24" /></td>
                  <td className="py-3 px-2"><Input value={editDept} onChange={(e) => setEditDept(e.target.value)} className="w-28" /></td>
                  <td className="py-3 px-2"><Input type="number" value={editSalaire} onChange={(e) => setEditSalaire(e.target.value)} className="w-28 text-right" /></td>
                  <td className="py-3 px-2"><Input type="number" value={editPlafond} onChange={(e) => setEditPlafond(e.target.value)} className="w-28 text-right" /></td>
                  <td className="py-3 px-2 text-right space-x-2">
                    <button onClick={() => handleSave(emp.id)} className="text-green-600 hover:underline text-xs">Sauver</button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 hover:underline text-xs">Annuler</button>
                  </td>
                </tr>
              ) : (
                <tr key={emp.id} className="border-b border-gray-100">
                  <td className="py-3 px-2 font-medium">{emp.prenom} {emp.nom}</td>
                  <td className="py-3 px-2 text-gray-500">{emp.email}</td>
                  <td className="py-3 px-2">{emp.matricule || '-'}</td>
                  <td className="py-3 px-2">{emp.departement || '-'}</td>
                  <td className="py-3 px-2 text-right">{formatMontant(emp.salaire_net)}</td>
                  <td className="py-3 px-2 text-right">{formatMontant(emp.plafond_credit)}</td>
                  <td className="py-3 px-2 text-right"><button onClick={() => startEdit(emp)} className="text-blue-600 hover:underline text-xs">Modifier</button></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
