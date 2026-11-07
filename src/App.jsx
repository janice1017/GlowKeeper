import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, Plus, Search, Package, Trash2, Edit3, Sun, Moon, X, 
  Camera, Tag, Cloud, ArrowUpDown
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAR655DtBH7dpgq-9Zq8U6F8ONI5_fc234",
  authDomain: "glowkeeper-492cf.firebaseapp.com",
  projectId: "glowkeeper-492cf",
  storageBucket: "glowkeeper-492cf.firebasestorage.app",
  messagingSenderId: "1071240274402",
  appId: "1:1071240274402:web:db8ea9baf173b0486719bb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');
  const [routineTime, setRoutineTime] = useState('AM');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('expiryDate');
  const [sortOrder, setSortOrder] = useState('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [scanPreview, setScanPreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const fileInputRef = useRef(null);

  const initialFormState = {
    name: '', brand: '', imageUrl: '', category: 'Serum 精華', price: '',
    size: '', purchaseLocation: '', purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '', status: 'unopened', isMultiPack: false, totalQuantity: 1,
    remainingQuantity: 1, unit: '塊', routineStage: 'AM/PM', notes: '', tagsInput: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const presetTags = ['#敏感肌必備', '#空瓶回購', '#平價替代', '#抗衰老', '#急救修復', '#控油祛痘', '#美白提亮', '#保濕補水'];
  const presetLocations = ['專櫃', '莎莎', '卓悅', 'Sephora', '松本清', 'Donki', '官網', 'Olive Young'];
  const categories = ['Cleanser 洗面', 'Toner 爽膚水', 'Serum 精華', 'Moisturizer 乳液面霜', 'Eye Cream 眼霜', 'Mask 面膜', 'Sunscreen 防曬', 'Hair 頭髮護理', 'Bodycare 身體護理', 'Special 特別護理'];

  // Real-time sync with Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'items'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setLoading(false);
    }, (error) => {
      console.error('Firebase error:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'totalQuantity' && !editingId) updated.remainingQuantity = Number(value);
      return updated;
    });
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({ ...item, imageUrl: item.imageUrl || '', tagsInput: Array.isArray(item.tags) ? item.tags.join(' ') : (item.tags || '') });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setAiError('');
    setScanPreview(null);
    setImageBase64(null);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setScanPreview(previewUrl);
    setFormData(prev => ({ ...prev, imageUrl: previewUrl }));

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setImageBase64(base64);
      setFormData(prev => ({ ...prev, imageUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleAiLookup = async () => {
    if (!formData.name.trim() && !imageBase64) {
      setAiError('請先輸入產品名稱或上傳圖片');
      return;
    }
    setAiLoading(true);
    setAiError('');

    try {
      let prompt = `請用繁體中文回應純 JSON，包含以下 key：
- name: 產品名稱
- brand: 品牌
- category: 選自 ["Cleanser 洗面", "Toner 爽膚水", "Serum 精華", "Moisturizer 乳液面霜", "Eye Cream 眼霜", "Mask 面膜", "Sunscreen 防曬", "Hair 頭髮護理", "Bodycare 身體護理", "Special 特別護理"]
- routineStage: 選自 ["AM", "PM", "AM/PM", "Weekly"]
- notes: 1-2句功效說明
- tags: 2-3個 # 標籤陣列
- size: 容量估計
- price: HKD 數字
- purchaseLocation: 購買渠道建議

只回應 JSON。`;

      if (formData.name) prompt += `\n產品名稱：${formData.name}`;
      if (formData.brand) prompt += `\n品牌：${formData.brand}`;

      const messages = [{ role: 'user', content: [] }];

      if (imageBase64) {
        messages[0].content.push({
          type: 'image_url',
          image_url: { url: imageBase64 }
        });
        prompt = `請辨識圖片上的護膚品資訊，並${prompt}`;
      }

      messages[0].content.push({ type: 'text', text: prompt });

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'grok-4',
          messages,
          temperature: 0.3
        })
      });

      const data = await response.json();
      const textResult = data?.choices?.[0]?.message?.content;

      if (textResult) {
        const cleanJson = textResult.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanJson);
        setFormData(prev => ({
          ...prev,
          name: result.name || prev.name,
          brand: result.brand || prev.brand,
          category: result.category || prev.category,
          routineStage: result.routineStage || prev.routineStage,
          notes: result.notes || prev.notes,
          size: result.size || prev.size,
          price: result.price || prev.price,
          purchaseLocation: result.purchaseLocation || prev.purchaseLocation,
          tagsInput: result.tags ? result.tags.join(' ') : prev.tagsInput
        }));
      }
    } catch (err) {
      console.error(err);
      setAiError('AI 分析失敗');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.expiryDate) return;
    const formattedTags = formData.tagsInput ? formData.tagsInput.split(/\s+/).map(t => t.startsWith('#') ? t : `#${t}`).filter(t => t.length > 1) : [];
    const todayStr = new Date().toISOString().split('T')[0];
    let finalFinishedDate = formData.finishedDate || '';
    if (formData.status === 'finished' && !finalFinishedDate) finalFinishedDate = todayStr;

    const itemData = {
      ...formData,
      price: Number(formData.price) || 0,
      finishedDate: finalFinishedDate,
      tags: formattedTags,
      updatedAt: new Date().toISOString()
    };
    delete itemData.tagsInput;

    try {
      if (editingId) {
        await updateDoc(doc(db, 'items', editingId), itemData);
      } else {
        await addDoc(collection(db, 'items'), { ...itemData, createdAt: new Date().toISOString() });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('儲存失敗');
    }
  };

  const handleDecrementQuantity = async (id) => {
    const item = items.find(i => i.id === id);
    if (!item || item.remainingQuantity <= 0) return;
    const nextQty = item.remainingQuantity - 1;
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      await updateDoc(doc(db, 'items', id), {
        remainingQuantity: nextQty,
        status: nextQty === 0 ? 'finished' : item.status,
        finishedDate: nextQty === 0 ? (item.finishedDate || todayStr) : item.finishedDate
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('確定刪除？')) return;
    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (err) {
      console.error(err);
    }
  };

  const getExpiryDetails = (expiryDateStr) => {
    if (!expiryDateStr) return { days: 999, status: 'normal', label: '' };
    const today = new Date(); today.setHours(0,0,0,0);
    const exp = new Date(expiryDateStr);
    const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (days < 0) return { days, status: 'expired', label: `已過期 ${Math.abs(days)} 天` };
    if (days <= 30) return { days, status: 'warning', label: `剩 ${days} 天到期` };
    return { days, status: 'good', label: `剩 ${days} 天` };
  };

  const allHashtags = useMemo(() => {
    const set = new Set();
    items.forEach(item => { if (Array.isArray(item.tags)) item.tags.forEach(t => set.add(t)); });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items.filter(item => {
      const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (item.brand || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      const matchesTag = filterTag === 'all' || (Array.isArray(item.tags) && item.tags.includes(filterTag));
      return matchesSearch && matchesStatus && matchesCategory && matchesTag;
    });
    result.sort((a, b) => {
      let valA = a[sortField] || '', valB = b[sortField] || '';
      if (sortField === 'expiryDate') { valA = new Date(valA).getTime() || 0; valB = new Date(valB).getTime() || 0; }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [items, searchQuery, filterStatus, filterCategory, filterTag, sortField, sortOrder]);

  const routineItems = useMemo(() => {
    return items.filter(item => item.status === 'in_use' && (item.routineStage === routineTime || item.routineStage === 'AM/PM')).sort((a, b) => (a.stepOrder || 99) - (b.stepOrder || 99));
  }, [items, routineTime]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]"><div className="text-stone-500">載入中...</div></div>;
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-800 font-sans">
      <header className="sticky top-0 z-30 bg-[#faf9f6]/80 backdrop-blur-md border-b border-stone-200/60 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-800 flex items-center justify-center text-white"><Sparkles className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-medium text-stone-900">GlowKeeper</h1>
              <p className="text-xs text-stone-500">護膚品庫存與 Routine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-stone-200/50 p-1 rounded-2xl">
              <button onClick={() => setActiveTab('inventory')} className={`px-3.5 py-1.5 rounded-xl text-xs font-medium ${activeTab === 'inventory' ? 'bg-white shadow-sm' : 'text-stone-600'}`}>庫存</button>
              <button onClick={() => setActiveTab('routine')} className={`px-3.5 py-1.5 rounded-xl text-xs font-medium ${activeTab === 'routine' ? 'bg-white shadow-sm' : 'text-stone-600'}`}>Routine</button>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-2xl"><Cloud className="h-4 w-4" />已同步</div>
            <button onClick={() => handleOpenModal()} className="flex items-center gap-1 bg-stone-900 text-white px-3.5 py-2 rounded-2xl text-xs"><Plus className="h-4 w-4" />新增</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-3xl border border-stone-200/60 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input type="text" placeholder="搜尋..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs" />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-stone-50 border rounded-2xl text-xs">
                  <option value="all">所有狀態</option>
                  <option value="unopened">未開封</option>
                  <option value="in_use">使用中</option>
                  <option value="finished">已用完</option>
                </select>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 bg-stone-50 border rounded-2xl text-xs">
                  <option value="all">所有類別</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {allHashtags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-2 border-t overflow-x-auto">
                  <Tag className="h-3 w-3 text-stone-400" />
                  <button onClick={() => setFilterTag('all')} className={`px-2.5 py-0.5 rounded-full text-[10px] ${filterTag === 'all' ? 'bg-stone-800 text-white' : 'bg-stone-100'}`}>全部</button>
                  {allHashtags.map(tag => (
                    <button key={tag} onClick={() => setFilterTag(filterTag === tag ? 'all' : tag)} className={`px-2.5 py-0.5 rounded-full text-[10px] whitespace-nowrap ${filterTag === tag ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-emerald-800'}`}>{tag}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b text-stone-500">
                    <tr>
                      <th className="py-3 px-4 w-16">圖片</th>
                      <th className="py-3 px-4"><button onClick={() => { setSortField('name'); setSortOrder(p => p === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1">產品 <ArrowUpDown className="h-3 w-3" /></button></th>
                      <th className="py-3 px-4">類別</th>
                      <th className="py-3 px-4">狀態</th>
                      <th className="py-3 px-4">數量</th>
                      <th className="py-3 px-4"><button onClick={() => { setSortField('expiryDate'); setSortOrder(p => p === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1">到期日 <ArrowUpDown className="h-3 w-3" /></button></th>
                      <th className="py-3 px-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredItems.length === 0 ? (
                      <tr><td colSpan="7" className="py-12 text-center text-stone-400"><Package className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>沒有找到護膚品</p></td></tr>
                    ) : filteredItems.map(item => {
                      const expiry = getExpiryDetails(item.expiryDate);
                      return (
                        <tr key={item.id} className="hover:bg-stone-50">
                          <td className="py-3 px-4">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="h-12 w-12 object-cover rounded-xl border" />
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-stone-100 flex items-center justify-center text-stone-300"><Package className="h-5 w-5" /></div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div onClick={() => setSelectedProduct(item)} className="font-semibold cursor-pointer hover:text-emerald-800">{item.name}</div>
                            <div className="text-[11px] text-stone-400">{item.brand}</div>
                            {Array.isArray(item.tags) && <div className="flex flex-wrap gap-1 mt-1">{item.tags.map(t => <span key={t} onClick={() => setFilterTag(t)} className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded cursor-pointer">{t}</span>)}</div>}
                          </td>
                          <td className="py-3 px-4"><span className="px-2 py-1 bg-stone-100 rounded-xl text-[11px]">{item.category}</span></td>
                          <td className="py-3 px-4">
                            {item.status === 'in_use' && <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">使用中</span>}
                            {item.status === 'unopened' && <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded">未開封</span>}
                            {item.status === 'finished' && <span className="text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded">已用完</span>}
                          </td>
                          <td className="py-3 px-4">
                            {item.isMultiPack ? (
                              <div className="flex flex-col gap-1">
                                <span>{item.remainingQuantity}/{item.totalQuantity} {item.unit}</span>
                                {item.remainingQuantity > 0 && <button onClick={() => handleDecrementQuantity(item.id)} className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border">-1</button>}
                              </div>
                            ) : <span>1 {item.unit}</span>}
                          </td>
                          <td className="py-3 px-4">
                            <div>{item.expiryDate || '-'}</div>
                            {expiry.label && <span className={`text-[10px] ${expiry.status === 'expired' ? 'text-red-600' : expiry.status === 'warning' ? 'text-amber-600' : 'text-emerald-700'}`}>{expiry.label}</span>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => handleOpenModal(item)} className="p-1.5 text-stone-400 hover:text-stone-700"><Edit3 className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-stone-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routine' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-3xl border shadow-sm">
              <div><h2 className="text-lg font-medium">每日護膚流程</h2><p className="text-xs text-stone-500">使用中護膚品</p></div>
              <div className="flex bg-stone-100 p-1 rounded-2xl">
                <button onClick={() => setRoutineTime('AM')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs ${routineTime === 'AM' ? 'bg-amber-100 text-amber-900' : ''}`}><Sun className="h-4 w-4" />早晨</button>
                <button onClick={() => setRoutineTime('PM')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs ${routineTime === 'PM' ? 'bg-indigo-100 text-indigo-950' : ''}`}><Moon className="h-4 w-4" />晚間</button>
              </div>
            </div>
            <div className="space-y-3">
              {routineItems.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border text-stone-400"><Sun className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>尚無使用中護膚品</p></div>
              ) : routineItems.map((item, index) => (
                <div key={item.id} onClick={() => setSelectedProduct(item)} className="p-4 rounded-3xl border bg-white shadow-sm flex items-center justify-between hover:border-emerald-800/40 cursor-pointer">
                  <div className="flex items-center space-x-4">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-14 w-14 object-cover rounded-2xl border shrink-0" />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-300 shrink-0"><Package className="h-6 w-6" /></div>
                    )}
                    <div>
                      <span className="text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">{item.category}</span>
                      <h3 className="font-semibold mt-0.5">{item.name}</h3>
                      <p className="text-xs text-stone-500">{item.brand}</p>
                    </div>
                  </div>
                  {item.size && <span className="text-[11px] text-stone-400 bg-stone-50 px-2.5 py-1 rounded-xl">{item.size}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-stone-50">
              <h2 className="font-semibold">{editingId ? '編輯' : '新增'}護膚品</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-900 font-medium flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Grok AI</span>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-[11px] bg-white border px-2.5 py-1 rounded-xl"><Camera className="h-3.5 w-3.5" />上傳圖片</button>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
                {scanPreview && <div className="flex items-center gap-2"><img src={scanPreview} alt="" className="h-16 w-16 object-cover rounded-xl border" /><span className="text-[10px] text-stone-500">已載入圖片</span></div>}
                <button type="button" onClick={handleAiLookup} disabled={aiLoading} className="w-full py-1.5 bg-emerald-800 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <Sparkles className="h-3.5 w-3.5" />{aiLoading ? '分析中...' : 'AI 智能填寫'}
                </button>
                {aiError && <p className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded">{aiError}</p>}
              </div>

              <div>
                <label className="block text-stone-600 mb-1">產品圖片連結</label>
                <input type="text" name="imageUrl" placeholder="可貼上圖片網址，或用上方上傳" value={formData.imageUrl?.startsWith('data:') ? '' : formData.imageUrl} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" />
                {formData.imageUrl && <img src={formData.imageUrl} alt="" className="mt-2 h-16 w-16 object-cover rounded-xl border" />}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-stone-600 mb-1">名稱 *</label><input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" /></div>
                <div><label className="block text-stone-600 mb-1">品牌</label><input type="text" name="brand" value={formData.brand} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" /></div>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">標籤</label>
                <input type="text" name="tagsInput" value={formData.tagsInput} onChange={handleInputChange} placeholder="#敏感肌 #保濕" className="w-full px-3 py-2 border rounded-xl" />
                <div className="flex flex-wrap gap-1 mt-1">{presetTags.map(tag => <button key={tag} type="button" onClick={() => setFormData(p => ({...p, tagsInput: p.tagsInput ? `${p.tagsInput} ${tag}` : tag}))} className="text-[10px] px-2 py-0.5 bg-stone-100 rounded-full">+ {tag}</button>)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-stone-600 mb-1">類別</label><select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-stone-600 mb-1">時段</label><select name="routineStage" value={formData.routineStage} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl"><option value="AM">早晨</option><option value="PM">晚間</option><option value="AM/PM">日夜</option><option value="Weekly">每週</option></select></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-stone-600 mb-1">容量</label><input type="text" name="size" value={formData.size} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" /></div>
                <div><label className="block text-stone-600 mb-1">價格 HKD</label><input type="number" name="price" value={formData.price} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-stone-600 mb-1">買入日期</label><input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" /></div>
                <div><label className="block text-stone-600 mb-1">到期日 *</label><input type="date" name="expiryDate" required value={formData.expiryDate} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" /></div>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">購買地點</label>
                <input type="text" name="purchaseLocation" value={formData.purchaseLocation} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" />
                <div className="flex flex-wrap gap-1 mt-1">{presetLocations.map(loc => <button key={loc} type="button" onClick={() => setFormData(p => ({...p, purchaseLocation: loc}))} className={`text-[10px] px-2 py-0.5 rounded-full border ${formData.purchaseLocation === loc ? 'bg-emerald-800 text-white' : 'bg-stone-100'}`}>{loc}</button>)}</div>
              </div>

              <div><label className="block text-stone-600 mb-1">狀態</label><select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl"><option value="unopened">未開封</option><option value="in_use">使用中</option><option value="finished">已用完</option></select></div>

              <div className="p-3 bg-stone-50 rounded-2xl border">
                <label className="flex items-center gap-2"><input type="checkbox" name="isMultiPack" checked={formData.isMultiPack} onChange={handleInputChange} />多件裝</label>
                {formData.isMultiPack && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div><label className="text-[10px]">總數量</label><input type="number" name="totalQuantity" value={formData.totalQuantity} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" /></div>
                    <div><label className="text-[10px]">剩餘</label><input type="number" name="remainingQuantity" value={formData.remainingQuantity} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" /></div>
                    <div><label className="text-[10px]">單位</label><input type="text" name="unit" value={formData.unit} onChange={handleInputChange} className="w-full px-2 py-1 border rounded" /></div>
                  </div>
                )}
              </div>

              <div><label className="block text-stone-600 mb-1">備註</label><textarea name="notes" rows="2" value={formData.notes} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl resize-none" /></div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl">取消</button>
                <button type="submit" className="px-5 py-2 bg-stone-900 text-white rounded-xl">儲存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-stone-50">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl text-xs">{selectedProduct.category}</span>
              <button onClick={() => setSelectedProduct(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              {selectedProduct.imageUrl && <img src={selectedProduct.imageUrl} alt="" className="w-full h-48 object-cover rounded-2xl" />}
              <h3 className="text-base font-bold">{selectedProduct.name}</h3>
              <p className="text-stone-500">品牌：{selectedProduct.brand || '-'}</p>
              {Array.isArray(selectedProduct.tags) && <div className="flex flex-wrap gap-1">{selectedProduct.tags.map(t => <span key={t} className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">{t}</span>)}</div>}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-stone-50 rounded-xl"><span className="text-[10px] text-stone-400 block">容量</span>{selectedProduct.size || '-'}</div>
                <div className="p-2.5 bg-stone-50 rounded-xl"><span className="text-[10px] text-stone-400 block">價格</span>{selectedProduct.price ? `$${selectedProduct.price}` : '-'}</div>
              </div>
              {selectedProduct.notes && <div className="p-3 bg-stone-50 rounded-xl"><span className="text-[10px] text-stone-400 block">備註</span>{selectedProduct.notes}</div>}
              <button onClick={() => { const t = selectedProduct; setSelectedProduct(null); handleOpenModal(t); }} className="w-full py-2.5 bg-stone-900 text-white rounded-2xl text-xs flex items-center justify-center gap-1.5"><Edit3 className="h-3.5 w-3.5" />編輯</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
