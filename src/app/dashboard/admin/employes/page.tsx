'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatMontant, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Profile } from '@/types';
import { useEffect, useState } from 'react';

export default function AdminEmployesPage() {
  const { profile, isAdmin } = useAuth();
  const supabase = createClient();
  const [employes, setEmployes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSalaire, setEditSalaire] = useState('');
  const [editPlafond, setEditPlafond] = useState('');
  const [editMatricule, setEditMatricule] = useState('');
  const [editDept, setEditDept] = useState('');

  useEffect(() => {
    if (!profile || !isAdmin) return;
    loadEmployes();
  }, [profile, isAdmin]);

  async function loadEmployes() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'employe')
      .order('nom', { ascending: true });
    setEmployes(data || []);
    setLoading(false);
  }

  async function handleSave(employeId: string) {
    await supabase
      .from('profiles')
      .update({
        salaire_net: parseFloat(editSalaire) || 0,
        plafond_credit: parseFloat(editPlafond) || 0,
        matricule: editMatricule || null,
        departement: editDept || null,
      })
      .eq('id', employeId);

    setEditingId(null);
    loadEmployes();
  }

  function startEdit(emp: Profile) {
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
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : employes.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">Aucun employé enregistré</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Nom</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Matricule</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Département</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Salaire net</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Plafond crédit</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employes.map((emp) => (
                    <tr key={emp.id} className="border-b border-gray-100">
                      {editingId === emp.id ? (
                        <>
                          <td className="py-3 px-2 font-medium">{emp.prenom} {emp.nom}</td>
                          <td className="py-3 px-2 text-gray-500">{emp.email}</td>
                          <td className="py-3 px-2">
                            <Input
                              value={editMatricule}
                              onChange={(e) => setEditMatricule(e.target.value)}
                              className="w-24"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              value={editDept}
                              onChange={(e) => setEditDept(e.target.value)}
                              className="w-28"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              value={editSalaire}
                              onChange={(e) => setEditSalaire(e.target.value)}
                              className="w-28 text-right"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              value={editPlafond}
                              onChange={(e) => setEditPlafond(e.target.value)}
                              className="w-28 text-right"
                            />
                          </td>
                          <td className="py-3 px-2 text-right space-x-2">
                            <button
                              onClick={() => handleSave(emp.id)}
                              className="text-green-600 hover:underline text-xs"
                            >
                              Sauver
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-gray-500 hover:underline text-xs"
                            >
                              Annuler
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-2 font-medium">{emp.prenom} {emp.nom}</td>
                          <td className="py-3 px-2 text-gray-500">{emp.email}</td>
                          <td className="py-3 px-2">{emp.matricule || '-'}</td>
                          <td className="py-3 px-2">{emp.departement || '-'}</td>
                          <td className="py-3 px-2 text-right">{formatMontant(emp.salaire_net)}</td>
                          <td className="py-3 px-2 text-right">{formatMontant(emp.plafond_credit)}</td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => startEdit(emp)}
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Modifier
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
