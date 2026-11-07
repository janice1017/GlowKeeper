import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, Plus, Search, Calendar, Package, Clock, ShieldAlert, 
  CheckCircle2, Trash2, Edit3, Sun, Moon, X, Layers, 
  Check, Camera, ChevronRight, Heart, AlertCircle, RefreshCw, Filter,
  LayoutGrid, Table as TableIcon, ArrowUpDown, Tag, Cloud, Download, Upload, Copy, CheckCheck
} from 'lucide-react';

export default function App() {
  // --- Persistent Storage State ---
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('glowkeeper_minimal_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: '1',
        name: '潤澤修護玻尿酸精華',
        brand: 'Aesop',
        imageUrl: '',
        category: 'Serum 精華',
        price: 450,
        size: '50ml',
        purchaseLocation: '專櫃',
        purchaseDate: '2025-01-10',
        expiryDate: '2026-12-31',
        paoMonths: 12,
        openedDate: '2025-02-01',
        finishedDate: '',
        status: 'in_use',
        isMultiPack: false,
        totalQuantity: 1,
        remainingQuantity: 1,
        unit: '支',
        routineStage: 'AM/PM',
        stepOrder: 3,
        notes: '深層補水，質地清爽好吸收，適合打底。',
        keyBenefits: ['深層補水', '修護屏障', '舒緩乾燥'],
        tags: ['#保濕急救', '#敏弱肌必備', '#空瓶回購']
      },
      {
        id: '2',
        name: '積雪草鎮定舒緩面膜 Pack',
        brand: 'VT Cosmetics',
        imageUrl: '',
        category: 'Mask 面膜',
        price: 120,
        size: '10片/盒',
        purchaseLocation: '莎莎 Sasa',
        purchaseDate: '2025-02-01',
        expiryDate: '2026-08-15',
        paoMonths: 6,
        openedDate: '2025-02-05',
        finishedDate: '',
        status: 'in_use',
        isMultiPack: true,
        totalQuantity: 10,
        remainingQuantity: 7,
        unit: '塊',
        routineStage: 'Weekly',
        stepOrder: 6,
        notes: '退紅救星，肌膚不穩定時連敷三天。',
        keyBenefits: ['鎮定退紅', '密集修護', '急救補水'],
        tags: ['#退紅救星', '#平價替代', '#曬後修護']
      },
      {
        id: '3',
        name: '水感高倍防曬乳 SPF50+',
        brand: 'Anessa',
        imageUrl: '',
        category: 'Sunscreen 防曬',
        price: 210,
        size: '60ml',
        purchaseLocation: '松本清',
        purchaseDate: '2025-01-20',
        expiryDate: '2027-05-10',
        paoMonths: 12,
        openedDate: '',
        finishedDate: '',
        status: 'unopened',
        isMultiPack: false,
        totalQuantity: 1,
        remainingQuantity: 1,
        unit: '支',
        routineStage: 'AM',
        stepOrder: 5,
        notes: '成膜快，不油膩不致痘。',
        keyBenefits: ['高效防曬', '防水防汗', '清爽不黏'],
        tags: ['#清爽防曬', '#不致痘']
      }
    ];
  });

  // State Management
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

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  const [aiLoading, setAiLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [scanPreview, setScanPreview] = useState(null);
  const fileInputRef = useRef(null);
  const importFileRef = useRef(null);

  const initialFormState = {
    name: '',
    brand: '',
    imageUrl: '',
    category: 'Serum 精華',
    price: '',
    size: '',
    purchaseLocation: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    paoMonths: 12,
    openedDate: '',
    finishedDate: '',
    status: 'unopened',
    isMultiPack: false,
    totalQuantity: 1,
    remainingQuantity: 1,
    unit: '塊',
    routineStage: 'AM/PM',
    stepOrder: 3,
    notes: '',
    keyBenefits: [],
    tagsInput: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  
  const presetTags = ['#敏感肌必備', '#空瓶回購', '#平價替代', '#抗衰老', '#急救修復', '#控油祛痘', '#美白提亮', '#保濕補水', '#秋冬愛用'];
  const presetLocations = ['專櫃', '莎莎 Sasa', '卓悅', 'Sephora', '松本清', 'Don Don Donki', '日本藥妝店', '官網網購', 'Lookfantastic', 'Olive Young'];
  const categories = [
    'Cleanser 洗面', 'Toner 爽膚水', 'Serum 精華', 'Moisturizer 乳液面霜', 
    'Eye Cream 眼霜', 'Mask 面膜', 'Sunscreen 防曬', 'Hair 頭髮護理', 
    'Bath & Shower 洗澡', 'Bodycare 身體護理', 'Special 特別護理'
  ];

  useEffect(() => {
    localStorage.setItem('glowkeeper_minimal_items', JSON.stringify(items));
  }, [items]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'totalQuantity' && !editingId) {
        updated.remainingQuantity = Number(value);
      }
      return updated;
    });
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        ...item,
        imageUrl: item.imageUrl || '',
        tagsInput: Array.isArray(item.tags) ? item.tags.join(' ') : (item.tags || '')
      });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setAiError('');
    setScanPreview(null);
    setIsModalOpen(true);
  };

  const handleOpenSyncModal = () => {
    setJsonText(JSON.stringify(items, null, 2));
    setCopySuccess(false);
    setSyncStatusMsg('');
    setIsSyncModalOpen(true);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(items, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExportFile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `glowkeeper_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportText = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        setItems(parsed);
        setSyncStatusMsg('✅ 數據匯入成功！已更新全域護膚品列表。');
        setTimeout(() => setIsSyncModalOpen(false), 1200);
      } else {
        setSyncStatusMsg('❌ 格式錯誤：JSON 必須為陣列格式。');
      }
    } catch (err) {
      setSyncStatusMsg('❌ JSON 解析失敗，請檢查格式是否完整。');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          setItems(parsed);
          setSyncStatusMsg('✅ 檔案匯入成功！');
          setTimeout(() => setIsSyncModalOpen(false), 1200);
        } else {
          setSyncStatusMsg('❌ 檔案內容格式不正確。');
        }
      } catch (err) {
        setSyncStatusMsg('❌ 讀取 JSON 檔案失敗。');
      }
    };
    reader.readAsText(file);
  };

  // Grok AI Lookup
  const handleAiLookup = async () => {
    if (!formData.name.trim()) {
      setAiError('請先輸入護膚品名稱');
      return;
    }

    setAiLoading(true);
    setAiError('');

    try {
      const prompt = `分析護膚品：「${formData.name}」。
請用繁體中文回應純 JSON 格式，包含以下 key:
- brand: 品牌名稱
- category: 選自 ["Cleanser 洗面", "Toner 爽膚水", "Serum 精華", "Moisturizer 乳液面霜", "Eye Cream 眼霜", "Mask 面膜", "Sunscreen 防曬", "Hair 頭髮護理", "Bath & Shower 洗澡", "Bodycare 身體護理", "Special 特別護理"]
- routineStage: 選自 ["AM", "PM", "AM/PM", "Weekly"]
- notes: 1-2句簡短功效說明
- tags: 2-3個以 # 開頭的繁體中文標籤陣列
- size: 標準容量估計
- price: 估計市場價格數字 (HKD)
- purchaseLocation: 常見購買渠道建議

只回應 JSON，不要加其他文字。`;

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'grok-4-latest',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        })
      });

      const data = await response.json();
      const textResult = data?.choices?.[0]?.message?.content;

      if (textResult) {
        const cleanJson = textResult.replace(/```json|```/g, '').trim();
        const resultJson = JSON.parse(cleanJson);
        
        setFormData(prev => ({
          ...prev,
          brand: resultJson.brand || prev.brand,
          category: resultJson.category || prev.category,
          routineStage: resultJson.routineStage || prev.routineStage,
          notes: resultJson.notes || prev.notes,
          size: resultJson.size || prev.size,
          price: resultJson.price || prev.price,
          purchaseLocation: resultJson.purchaseLocation || prev.purchaseLocation,
          tagsInput: resultJson.tags ? resultJson.tags.join(' ') : prev.tagsInput
        }));
      }
    } catch (err) {
      console.error(err);
      setAiError('AI 查詢失敗，請手動填寫');
    } finally {
      setAiLoading(false);
    }
  };

  // Image scan (local preview only for now)
  const handleImageScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setAiError('');

    try {
      const previewUrl = URL.createObjectURL(file);
      setScanPreview(previewUrl);
      setFormData(prev => ({ ...prev, imageUrl: previewUrl }));
      setOcrLoading(false);
    } catch (err) {
      console.error(err);
      setAiError('圖片載入失敗');
      setOcrLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.expiryDate) return;

    const formattedTags = formData.tagsInput
      ? formData.tagsInput.split(/\s+/).map(t => t.startsWith('#') ? t : `#${t}`).filter(t => t.length > 1)
      : [];

    const todayStr = new Date().toISOString().split('T')[0];
    let finalFinishedDate = formData.finishedDate;
    if (formData.status === 'finished' && !finalFinishedDate) {
      finalFinishedDate = todayStr;
    }

    if (editingId) {
      setItems(prev => prev.map(item => item.id === editingId ? {
        ...formData,
        price: formData.price ? Number(formData.price) : 0,
        finishedDate: finalFinishedDate,
        tags: formattedTags,
        id: editingId
      } : item));
    } else {
      const newItem = {
        ...formData,
        id: Date.now().toString(),
        price: formData.price ? Number(formData.price) : 0,
        finishedDate: finalFinishedDate,
        tags: formattedTags
      };
      setItems(prev => [newItem, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDecrementQuantity = (id) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setItems(prev => prev.map(item => {
      if (item.id === id && item.remainingQuantity > 0) {
        const nextQty = item.remainingQuantity - 1;
        const isFinishedNow = nextQty === 0;
        return {
          ...item,
          remainingQuantity: nextQty,
          status: isFinishedNow ? 'finished' : item.status,
          finishedDate: isFinishedNow ? (item.finishedDate || todayStr) : item.finishedDate
        };
      }
      return item;
    }));
  };

  const handleDelete = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const getExpiryDetails = (expiryDateStr) => {
    if (!expiryDateStr) return { days: 999, status: 'normal' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDateStr);
    const diffTime = exp - today;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (days < 0) return { days, status: 'expired', label: `已過期 ${Math.abs(days)} 天` };
    if (days <= 30) return { days, status: 'warning', label: `剩 ${days} 天到期` };
    return { days, status: 'good', label: `剩 ${days} 天` };
  };

  const allHashtags = useMemo(() => {
    const set = new Set();
    items.forEach(item => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach(t => set.add(t));
      }
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.purchaseLocation && item.purchaseLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      const matchesTag = filterTag === 'all' || (Array.isArray(item.tags) && item.tags.includes(filterTag));

      return matchesSearch && matchesStatus && matchesCategory && matchesTag;
    });

    result.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'expiryDate') {
        valA = new Date(valA).getTime() || 0;
        valB = new Date(valB).getTime() || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, searchQuery, filterStatus, filterCategory, filterTag, sortField, sortOrder]);

  const routineItems = useMemo(() => {
    return items.filter(item => 
      item.status === 'in_use' && 
      (item.routineStage === routineTime || item.routineStage === 'AM/PM')
    ).sort((a, b) => (a.stepOrder || 99) - (b.stepOrder || 99));
  }, [items, routineTime]);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-800 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      <header className="sticky top-0 z-30 bg-[#faf9f6]/80 backdrop-blur-md border-b border-stone-200/60 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-800 text-cream-50 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-medium tracking-tight text-stone-900">GlowKeeper</h1>
              <p className="text-xs text-stone-500">護膚品庫存與 Routine 護膚管家</p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3 flex-wrap">
            <div className="flex bg-stone-200/50 p-1 rounded-2xl border border-stone-200/40">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'inventory' 
                    ? 'bg-white text-stone-900 shadow-sm' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                庫存數據庫 Database
              </button>
              <button
                onClick={() => setActiveTab('routine')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'routine' 
                    ? 'bg-white text-stone-900 shadow-sm' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                護膚流程 Routine
              </button>
            </div>

            <button
              onClick={handleOpenSyncModal}
              className="flex items-center space-x-1 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 px-3 py-2 rounded-2xl text-xs font-medium shadow-2xs transition-all active:scale-95"
              title="跨裝置同步與資料備份"
            >
              <Cloud className="h-4 w-4 text-emerald-800" />
              <span className="hidden sm:inline">數據同步</span>
            </button>

            <button
              onClick={() => handleOpenModal()}
              className="flex items-center space-x-1 bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-2 rounded-2xl text-xs font-medium shadow-sm transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>新增護膚品</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-3xl border border-stone-200/60 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="搜尋產品、品牌、購買地點或備註..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200/70 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 transition-all"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-stone-50 border border-stone-200/70 rounded-2xl text-xs text-stone-700 outline-none focus:ring-2 focus:ring-emerald-800/20"
                  >
                    <option value="all">所有狀態 (All)</option>
                    <option value="unopened">⚪ 未開封 Unopened</option>
                    <option value="in_use">🟢 使用中 In Use</option>
                    <option value="finished">⚫ 已用完 Finished</option>
                  </select>

                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2 bg-stone-50 border border-stone-200/70 rounded-2xl text-xs text-stone-700 outline-none focus:ring-2 focus:ring-emerald-800/20"
                  >
                    <option value="all">所有保養類別</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {(filterStatus !== 'all' || filterCategory !== 'all' || filterTag !== 'all' || searchQuery) && (
                    <button
                      onClick={() => {
                        setFilterStatus('all');
                        setFilterCategory('all');
                        setFilterTag('all');
                        setSearchQuery('');
                      }}
                      className="p-2 text-stone-400 hover:text-stone-700 bg-stone-100 rounded-xl text-xs transition-colors"
                      title="重置篩選"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {allHashtags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] text-stone-400 font-medium whitespace-nowrap flex items-center gap-1">
                    <Tag className="h-3 w-3" /> 標籤篩選:
                  </span>
                  <button
                    onClick={() => setFilterTag('all')}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                      filterTag === 'all' 
                        ? 'bg-stone-800 text-white' 
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    全部
                  </button>
                  {allHashtags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setFilterTag(filterTag === tag ? 'all' : tag)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all whitespace-nowrap ${
                        filterTag === tag 
                          ? 'bg-emerald-800 text-white' 
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-stone-200/60 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700 border-collapse">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-200/60 text-stone-500 font-medium select-none">
                      <th className="py-3.5 px-4">
                        <button 
                          onClick={() => { setSortField('name'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
                          className="flex items-center gap-1 hover:text-stone-900 font-medium"
                        >
                          產品與品牌 / 標籤
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="py-3.5 px-4">類別 Category</th>
                      <th className="py-3.5 px-4">狀態 Status</th>
                      <th className="py-3.5 px-4">剩餘數量 Quantity</th>
                      <th className="py-3.5 px-4">
                        <button 
                          onClick={() => { setSortField('expiryDate'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
                          className="flex items-center gap-1 hover:text-stone-900 font-medium"
                        >
                          到期日 Expiry
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="py-3.5 px-4 text-right">操作 Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-stone-400">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p>沒有找到符合條件的護膚品</p>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const expiry = getExpiryDetails(item.expiryDate);
                        return (
                          <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="py-3.5 px-4">
                              <div>
                                <div 
                                  onClick={() => setSelectedProduct(item)}
                                  className="font-semibold text-stone-900 text-sm hover:text-emerald-800 hover:underline cursor-pointer transition-colors inline-block"
                                >
                                  {item.name}
                                </div>
                                <div className="text-[11px] text-stone-400 font-normal">
                                  {item.brand}
                                </div>
                                {Array.isArray(item.tags) && item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.tags.map(t => (
                                      <span 
                                        key={t}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFilterTag(filterTag === t ? 'all' : t);
                                        }}
                                        className="text-[10px] text-emerald-800 bg-emerald-50/90 hover:bg-emerald-100 px-1.5 py-0.5 rounded-md cursor-pointer transition-colors"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded-xl text-[11px] font-medium">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {item.status === 'in_use' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                                  🟢 使用中
                                </span>
                              )}
                              {item.status === 'unopened' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                                  ⚪ 未開封
                                </span>
                              )}
                              {item.status === 'finished' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                                  ⚫ 已用完
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {item.isMultiPack ? (
                                <div className="flex flex-col items-start gap-1">
                                  <span className="font-medium text-stone-800">
                                    {item.remainingQuantity} / {item.totalQuantity} {item.unit}
                                  </span>
                                  {item.remainingQuantity > 0 && (
                                    <button
                                      onClick={() => handleDecrementQuantity(item.id)}
                                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-md border border-emerald-200/60 transition-colors shadow-2xs"
                                    >
                                      -1 {item.unit}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-stone-500 font-medium">1 {item.unit}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div>
                                <div className="font-medium text-stone-800">{item.expiryDate || '-'}</div>
                                {expiry.label && (
                                  <span className={`text-[10px] font-medium ${
                                    expiry.status === 'expired' ? 'text-red-600' :
                                    expiry.status === 'warning' ? 'text-amber-600' : 'text-emerald-700'
                                  }`}>
                                    {expiry.label}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => handleOpenModal(item)}
                                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
                                  title="編輯"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                  title="刪除"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routine' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-stone-200/60 shadow-sm">
              <div>
                <h2 className="text-lg font-medium text-stone-900">每日護膚保養流程</h2>
                <p className="text-xs text-stone-500">按照早晚順序顯示使用中護膚品</p>
              </div>
              <div className="flex bg-stone-100 p-1 rounded-2xl">
                <button
                  onClick={() => setRoutineTime('AM')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                    routineTime === 'AM' 
                      ? 'bg-amber-100 text-amber-900 shadow-sm' 
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Sun className="h-4 w-4 text-amber-600" />
                  <span>早晨 AM</span>
                </button>
                <button
                  onClick={() => setRoutineTime('PM')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                    routineTime === 'PM' 
                      ? 'bg-indigo-100 text-indigo-950 shadow-sm' 
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Moon className="h-4 w-4 text-indigo-600" />
                  <span>晚間 PM</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {routineItems.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-stone-200/60 text-stone-400">
                  <Sun className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>尚無標記為【{routineTime}】且【使用中】的護膚品</p>
                </div>
              ) : (
                routineItems.map((item, index) => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedProduct(item)}
                    className="p-4 rounded-3xl border bg-white border-stone-200/60 shadow-sm flex items-center justify-between hover:border-emerald-800/40 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-8 w-8 rounded-2xl bg-emerald-50 text-emerald-800 font-mono text-xs font-semibold flex items-center justify-center border border-emerald-100 shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          <span className="text-xs text-stone-400">{item.brand}</span>
                        </div>
                        <h3 className="font-semibold text-stone-900 mt-0.5 hover:text-emerald-800 transition-colors">
                          {item.name}
                        </h3>
                        {item.notes && (
                          <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    {item.size && (
                      <span className="text-[11px] text-stone-400 bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-200/50 font-medium shrink-0">
                        {item.size}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
              <div className="flex items-center space-x-2">
                <Cloud className="h-5 w-5 text-emerald-800" />
                <h3 className="font-semibold text-stone-900">跨裝置數據同步 / 備份</h3>
              </div>
              <button onClick={() => setIsSyncModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-stone-500 leading-relaxed">將數據複製貼到另一部裝置，即可同步你的護膚品庫存。</p>
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-emerald-950">方法 A：剪貼簿一鍵同步</h4>
                  <p className="text-[11px] text-emerald-700">複製 JSON 文字貼到另一部裝置</p>
                </div>
                <button onClick={handleCopyJson} className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-medium">
                  {copySuccess ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copySuccess ? '已複製！' : '複製 JSON'}</span>
                </button>
              </div>
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/60 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-stone-800">方法 B：檔案備份</h4>
                  <p className="text-[11px] text-stone-500">下載或上傳 JSON 檔案</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportFile} className="flex items-center gap-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 px-3 py-1.5 rounded-xl text-xs font-medium">
                    <Download className="h-3.5 w-3.5" />
                    <span>下載備份</span>
                  </button>
                  <button onClick={() => importFileRef.current?.click()} className="flex items-center gap-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 px-3 py-1.5 rounded-xl text-xs font-medium">
                    <Upload className="h-3.5 w-3.5" />
                    <span>上傳檔案</span>
                  </button>
                  <input type="file" ref={importFileRef} accept=".json" onChange={handleFileUpload} className="hidden" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-stone-600 font-medium">數據 JSON 代碼：</label>
                <textarea
                  rows="4"
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-[11px] text-stone-700 focus:ring-2 focus:ring-emerald-800/20 outline-none resize-none"
                />
              </div>
              {syncStatusMsg && (
                <p className="text-xs font-medium text-stone-800 bg-stone-100 p-2.5 rounded-xl border border-stone-200">{syncStatusMsg}</p>
              )}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsSyncModalOpen(false)} className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50">關閉</button>
                <button type="button" onClick={handleImportText} className="px-5 py-2 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800">匯入此數據</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200/60">{selectedProduct.category}</span>
              <button onClick={() => setSelectedProduct(null)} className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/50"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="flex items-start space-x-4">
                {selectedProduct.imageUrl && (
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="h-20 w-20 object-cover rounded-2xl border border-stone-200 shadow-sm shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="text-base font-bold text-stone-900 leading-snug">{selectedProduct.name}</h3>
                  <p className="text-stone-500 text-xs mt-0.5 font-medium">品牌：{selectedProduct.brand || '未填寫'}</p>
                  {Array.isArray(selectedProduct.tags) && selectedProduct.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedProduct.tags.map(t => (
                        <span key={t} className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 font-medium">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-stone-600">
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">容量 Size</span>
                  <span className="font-medium text-stone-800">{selectedProduct.size || '-'}</span>
                </div>
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">價格 Price</span>
                  <span className="font-medium text-stone-800">{selectedProduct.price ? `HKD $${selectedProduct.price}` : '-'}</span>
                </div>
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">買入日期</span>
                  <span className="font-medium text-stone-800">{selectedProduct.purchaseDate || '-'}</span>
                </div>
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-400 block">購買地點</span>
                  <span className="font-medium text-stone-800">{selectedProduct.purchaseLocation || '-'}</span>
                </div>
              </div>
              {selectedProduct.isMultiPack && (
                <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <span className="text-stone-600 font-medium">剩餘數量:</span>
                  <span className="font-bold text-emerald-900 text-sm">{selectedProduct.remainingQuantity} / {selectedProduct.totalQuantity} {selectedProduct.unit}</span>
                </div>
              )}
              {selectedProduct.notes && (
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                  <span className="text-[10px] text-stone-400 font-medium block">備註 / 使用心得</span>
                  <p className="text-stone-700 leading-relaxed text-xs">{selectedProduct.notes}</p>
                </div>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedProduct;
                    setSelectedProduct(null);
                    handleOpenModal(target);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-stone-900 text-white font-medium hover:bg-stone-800 flex items-center justify-center gap-1.5 text-xs"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>編輯此產品資料</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 shrink-0">
              <h2 className="font-semibold text-stone-900">{editingId ? '編輯護膚品資料' : '新增護膚品'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/50"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-900 font-medium flex items-center gap-1 text-xs">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-700" /> Grok AI 智能補全
                  </span>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={ocrLoading} className="flex items-center space-x-1 text-[11px] bg-white text-stone-700 border border-stone-200 px-2.5 py-1 rounded-xl shadow-sm">
                    <Camera className="h-3.5 w-3.5 text-emerald-700" />
                    <span>{ocrLoading ? '載入中...' : '上傳圖片'}</span>
                  </button>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageScan} className="hidden" />
                </div>
                {scanPreview && (
                  <div className="flex items-center space-x-2 pt-1">
                    <img src={scanPreview} alt="Preview" className="h-10 w-10 object-cover rounded-lg border" />
                    <span className="text-[10px] text-stone-500">已載入圖片</span>
                  </div>
                )}
                <button type="button" onClick={handleAiLookup} disabled={aiLoading} className="w-full py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{aiLoading ? 'Grok 分析中...' : 'Grok AI 智能填寫'}</span>
                </button>
                {aiError && <p className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">{aiError}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600 font-medium">產品圖片連結 (Image URL)</label>
                <input type="text" name="imageUrl" placeholder="可貼上圖片網址" value={formData.imageUrl} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">護膚品名稱 Name *</label>
                  <input type="text" name="name" required placeholder="例: 金盞花植物精華爽膚水" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none" />
                </div>
                <div>
                  <label className="block text-stone-600 font-medium mb-1">品牌 Brand</label>
                  <input type="text" name="brand" placeholder="例: Kiehl's" value={formData.brand} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-600 font-medium">標籤 / Hashtags</label>
                <input type="text" name="tagsInput" placeholder="例: #敏感肌必備 #空瓶回購" value={formData.tagsInput} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none" />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="text-[10px] text-stone-400 self-center">快捷標籤：</span>
                  {presetTags.map(tag => (
                    <button key={tag} type="button" onClick={() => {
                      const current = formData.tagsInput.trim();
                      if (!current.includes(tag)) {
                        setFormData(prev => ({ ...prev, tagsInput: current ? `${current} ${tag}` : tag }));
                      }
                    }} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 hover:bg-emerald-50 text-stone-600 border border-stone-200/60">+ {tag}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">保養類別 Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 font-medium mb-1">護膚流程時段 Stage</label>
                  <select name="routineStage" value={formData.routineStage} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none">
                    <option value="AM">☀️ 早晨 AM Routine</option>
                    <option value="PM">🌙 晚間 PM Routine</option>
                    <option value="AM/PM">☀️🌙 日夜皆可用</option>
                    <option value="Weekly">🗓️ 每週特別護理</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">容量 / 規格 Size</label>
                  <input type="text" name="size" placeholder="例: 50ml" value={formData.size} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none" />
                </div>
                <div>
                  <label className="block text-stone-600 font-medium mb-1">價格 Price (HKD $)</label>
                  <input type="number" name="price" placeholder="例: 350" value={formData.price} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">買入日期 Purchase Date</label>
                  <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none" />
                </div>
                <div>
                  <label className="block text-stone-600 font-medium mb-1">到期日 Expiry Date *</label>
                  <input type="date" name="expiryDate" required value={formData.expiryDate} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-600 font-medium">購買地點 / 渠道</label>
                <input type="text" name="purchaseLocation" placeholder="例: Sephora / 莎莎" value={formData.purchaseLocation} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none" />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="text-[10px] text-stone-400 self-center">快速選擇：</span>
                  {presetLocations.map(loc => (
                    <button key={loc} type="button" onClick={() => setFormData(prev => ({ ...prev, purchaseLocation: loc }))} className={`text-[10px] px-2 py-0.5 rounded-full transition-colors border ${formData.purchaseLocation === loc ? 'bg-emerald-800 text-white border-emerald-800' : 'bg-stone-100 hover:bg-emerald-50 text-stone-600 border-stone-200/60'}`}>{loc}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">用完日期 Finished Date</label>
                <input type="date" name="finishedDate" value={formData.finishedDate} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none" />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">當前狀態 Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none">
                  <option value="unopened">⚪ 未開封 Unopened</option>
                  <option value="in_use">🟢 使用中 In Use</option>
                  <option value="finished">⚫ 已用完 Finished</option>
                </select>
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl space-y-2 border border-stone-200/60">
                <label className="flex items-center gap-2 font-medium text-stone-700 cursor-pointer">
                  <input type="checkbox" name="isMultiPack" checked={formData.isMultiPack} onChange={handleInputChange} className="rounded text-emerald-800 focus:ring-emerald-800" />
                  屬於多件裝 / 面膜盒裝
                </label>
                {formData.isMultiPack && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-stone-500 text-[10px]">總數量</label>
                      <input type="number" name="totalQuantity" value={formData.totalQuantity} onChange={handleInputChange} className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg outline-none" />
                    </div>
                    <div>
                      <label className="block text-stone-500 text-[10px]">剩餘數量</label>
                      <input type="number" name="remainingQuantity" value={formData.remainingQuantity} onChange={handleInputChange} className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg outline-none" />
                    </div>
                    <div>
                      <label className="block text-stone-500 text-[10px]">單位</label>
                      <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} className="w-full px-2 py-1 bg-white border border-stone-200 rounded-lg outline-none" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">備註 / 使用心得 Notes</label>
                <textarea name="notes" rows="2" placeholder="簡短記錄使用心得..." value={formData.notes} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-800/20 outline-none resize-none" />
              </div>

              <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-stone-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50">取消</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800">儲存資料</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
