import { useState, useEffect } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { financialService } from "../services/financialService";
import {
    TrendingUp, TrendingDown, CreditCard as CardIcon,
    ArrowUpRight, ArrowDownRight, Filter, Search,
    Download, LayoutDashboard, Plus, History, RotateCcw
} from "lucide-react";
import { Button } from "../components/ui/button";
import { SimpleAlert } from "../components/shared/SimpleAlert";

export default function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ totalInflow: 0, totalOutflow: 0, totalProfit: 0, totalUPI: 0, totalCash: 0, totalBankTransfer: 0, totalCard: 0 });
    const [activeTab, setActiveTab] = useState("summary"); // "history" or "summary"
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // UI Local State
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, txnId: null });
    const [dragOverCardId, setDragOverCardId] = useState(null);

    const [filters, setFilters] = useState({
        type: "",
        category: "",
        startDate: "",
        endDate: ""
    });

    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "" });
    const showAlert = (title, message) => setAlertConfig({ isOpen: true, title, message });

    useEffect(() => {
        fetchData();
    }, [page, filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [txnData, cardData, summaryData] = await Promise.all([
                financialService.getTransactions({ ...filters, page, size: 20 }),
                financialService.getCards(),
                financialService.getSummary(filters)
            ]);

            setTransactions(txnData?.content || []);
            setTotalPages(txnData?.totalPages || 0);
            setCards(cardData || []);
            setSummary(summaryData || { totalInflow: 0, totalOutflow: 0, totalProfit: 0, totalUPI: 0, totalCash: 0, totalBankTransfer: 0, totalCard: 0 });

            // Fetch unbilled amounts for cards
            const updatedCards = await Promise.all(cardData.map(async card => {
                const unbilled = await financialService.getUnbilledAmount(card.id);
                return { ...card, unbilled };
            }));
            setCards(updatedCards);
        } catch (e) {
            console.error(e);
            showAlert("Error", "Failed to load financial data.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetCard = async (id) => {
        if (!window.confirm("Mark this card as paid and create a DEBIT entry in the ledger for the statement amount?")) return;
        try {
            await financialService.markCardAsPaid(id);
            fetchData();
            showAlert("Success", "Credit card statement cleared and recorded in ledger.");
        } catch (e) {
            showAlert("Error", "Failed to reset card.");
        }
    };

    const handleLinkToCard = async (txnId, cardId) => {
        try {
            await financialService.linkTransactionToCard(txnId, cardId);
            fetchData();
            setContextMenu({ visible: false, x: 0, y: 0, txnId: null });
        } catch (e) {
            showAlert("Error", "Failed to link transaction to card.");
        }
    };

    const onContextMenu = (e, txnId) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.pageX, y: e.pageY, txnId });
    };

    const onDragStart = (e, txnId) => {
        e.dataTransfer.setData("txnId", txnId);
    };

    const onDrop = async (e, cardId) => {
        e.preventDefault();
        setDragOverCardId(null);
        const txnId = e.dataTransfer.getData("txnId");
        if (txnId && cardId) {
            handleLinkToCard(txnId, cardId);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <PageHeader title="Financial Ledger">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        Export Report
                    </Button>
                    <Button size="sm" className="gap-2" onClick={() => showAlert("Feature Soon", "Manual transaction entry coming soon.")}>
                        <Plus className="w-4 h-4" />
                        Manual Entry
                    </Button>
                </div>
            </PageHeader>

            <div className="p-6 space-y-6 flex-1 overflow-auto">
                {/* Visual Tab Switcher */}
                <div className="flex p-1 bg-muted/50 rounded-xl border w-fit">
                    <button
                        onClick={() => setActiveTab("summary")}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'summary' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Analytics Summary
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <History className="w-4 h-4" />
                        Transaction History
                    </button>
                </div>

                {/* Filters (Active in both tabs) */}
                <div className="bg-card border rounded-xl p-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <select
                            className="bg-transparent text-sm font-medium focus:outline-none"
                            value={filters.type}
                            onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                        >
                            <option value="">All Types</option>
                            <option value="CREDIT">Collections (Credit)</option>
                            <option value="DEBIT">Expenses (Debit)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border">
                        <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                        <select
                            className="bg-transparent text-sm font-medium focus:outline-none"
                            value={filters.category}
                            onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                        >
                            <option value="">All Categories</option>
                            <option value="Photo Orders">Photo Orders</option>
                            <option value="Bill Payment">Bill Payments</option>
                            <option value="Service Orders">Services</option>
                            <option value="Money Transfer">Money Transfers</option>
                            <option value="MISC">Miscellaneous</option>
                        </select>
                    </div>

                    <div className="flex-1"></div>

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            className="bg-muted border rounded-lg px-3 py-1.5 text-sm"
                            value={filters.startDate}
                            onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                        <span className="text-muted-foreground font-medium">to</span>
                        <input
                            type="date"
                            className="bg-muted border rounded-lg px-3 py-1.5 text-sm"
                            value={filters.endDate}
                            onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                    </div>
                </div>

                {activeTab === 'summary' ? (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                        {/* Overall Profit & Inflow Visuals */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <TrendingUp className="absolute -bottom-4 -right-4 w-32 h-32 opacity-15 rotate-12" />
                                <p className="text-sm font-semibold opacity-90 uppercase tracking-wider">Overall Cash Inflow</p>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-4xl font-black">₹{summary.totalInflow.toLocaleString()}</span>
                                </div>
                                <p className="text-[10px] mt-4 font-medium py-1 px-2 bg-white/20 rounded-full w-fit">TOTAL COLLECTIONS</p>
                            </div>

                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <LayoutDashboard className="absolute -bottom-4 -right-4 w-32 h-32 opacity-15" />
                                <p className="text-sm font-semibold opacity-90 uppercase tracking-wider">Projected Net Profit</p>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-4xl font-black">₹{summary.totalProfit.toLocaleString()}</span>
                                </div>
                                <p className="text-[10px] mt-4 font-medium py-1 px-2 bg-white/20 rounded-full w-fit">AFTER SERVICE COSTS</p>
                            </div>

                            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <TrendingDown className="absolute -bottom-4 -right-4 w-32 h-32 opacity-15 -rotate-12" />
                                <p className="text-sm font-semibold opacity-90 uppercase tracking-wider">Total Expenses</p>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-4xl font-black">₹{summary.totalOutflow.toLocaleString()}</span>
                                </div>
                                <p className="text-[10px] mt-4 font-medium py-1 px-2 bg-white/20 rounded-full w-fit">DIRECT OVERHEADS</p>
                            </div>
                        </div>

                        {/* Payment Mode Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-card border rounded-xl p-4 shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">UPI Collections</p>
                                <h3 className="text-xl font-bold text-blue-600">₹{summary.totalUPI?.toLocaleString() || 0}</h3>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Cash Collections</p>
                                <h3 className="text-xl font-bold text-emerald-600">₹{summary.totalCash?.toLocaleString() || 0}</h3>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Bank Transfer</p>
                                <h3 className="text-xl font-bold text-orange-600">₹{summary.totalBankTransfer?.toLocaleString() || 0}</h3>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Card Collections</p>
                                <h3 className="text-xl font-bold text-purple-600">₹{summary.totalCard?.toLocaleString() || 0}</h3>
                            </div>
                        </div>

                        {/* Profitability Index Card */}
                        <div className="bg-card border rounded-2xl p-8 text-center space-y-4">
                            <h4 className="text-muted-foreground font-semibold uppercase tracking-widest text-xs">Financial Performance Index</h4>
                            <div className="relative inline-flex items-center justify-center">
                                <svg className="w-48 h-48 transform -rotate-90">
                                    <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-muted/20" />
                                    <circle
                                        cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent"
                                        strokeDasharray={2 * Math.PI * 80}
                                        strokeDashoffset={2 * Math.PI * 80 * (1 - (summary.totalInflow > 0 ? summary.totalProfit / summary.totalInflow : 0))}
                                        className="text-blue-500 transition-all duration-1000 ease-out"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute text-center">
                                    <span className="text-3xl font-black block">{summary.totalInflow > 0 ? Math.round((summary.totalProfit / summary.totalInflow) * 100) : 0}%</span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Profit Margin</span>
                                </div>
                            </div>
                            <p className="max-w-md mx-auto text-sm text-muted-foreground leading-relaxed">
                                Your average profit margin for this period is <span className="font-bold text-foreground">{summary.totalInflow > 0 ? Math.round((summary.totalProfit / summary.totalInflow) * 100) : 0}%</span>.
                                This represents the percentage of revenue that turns into profit after covering base service costs.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Credit card cards (only in History) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {cards.map(card => (
                                <div
                                    key={card.id}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverCardId(card.id); }}
                                    onDragLeave={() => setDragOverCardId(null)}
                                    onDrop={(e) => onDrop(e, card.id)}
                                    className={`bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden group transition-all ${dragOverCardId === card.id ? 'ring-2 ring-blue-500 bg-blue-50/50 scale-[1.02]' : ''
                                        }`}
                                >
                                    <div className="absolute top-0 right-0 p-2 opacity-50">
                                        <CardIcon className="w-8 h-8 rotate-12" style={{ color: card.color }} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.name}</p>
                                        <h3 className="text-2xl font-bold">₹{card.unbilled?.toLocaleString() || 0}</h3>
                                        <div className="flex items-center gap-1.5 pt-1">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">UNBILLED</span>
                                            <span className="text-[10px] text-muted-foreground">Cycle: {card.billingDate}th</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleResetCard(card.id)}
                                        className="absolute bottom-2 right-2 p-1.5 bg-muted rounded-md hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        title="Clear Statement"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Transactions Table */}
                        <div className="bg-card border rounded-xl shadow-sm overflow-hidden" onClick={() => setContextMenu({ visible: false })}>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-muted-foreground">Timestamp</th>
                                        <th className="px-4 py-3 font-semibold text-muted-foreground">Type</th>
                                        <th className="px-4 py-3 font-semibold text-muted-foreground">Category</th>
                                        <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Order#</th>
                                        <th className="px-4 py-3 font-semibold text-muted-foreground">Action</th>
                                        <th className="px-4 py-3 font-semibold text-muted-foreground">Mode</th>
                                        <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Amount</th>
                                        <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Profit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-[13px]">
                                    {Array.isArray(transactions) && transactions.map(txn => (
                                        <tr
                                            key={txn.id}
                                            draggable={txn.category === 'Bill Payment'}
                                            onDragStart={(e) => onDragStart(e, txn.id)}
                                            onContextMenu={(e) => onContextMenu(e, txn.id)}
                                            className={`hover:bg-muted/30 transition-colors cursor-default ${txn.category === 'Bill Payment' ? 'cursor-grab active:cursor-grabbing' : ''
                                                }`}
                                        >
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                {new Date(txn.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${txn.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {txn.type === 'CREDIT' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                    {txn.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{txn.category}</td>
                                            <td className="px-4 py-3 font-mono text-center text-[10px] text-muted-foreground whitespace-nowrap">
                                                {txn.relatedId || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{txn.description}</span>
                                                    {txn.creditCardId && (
                                                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                                                            <CardIcon className="w-2.5 h-2.5" />
                                                            {cards.find(c => c.id === txn.creditCardId)?.name || 'Linked Card'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-wide ${txn.creditCardId ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-muted border-muted-foreground/20'
                                                    }`}>
                                                    {txn.creditCardId ? 'CREDIT_CARD' : txn.paymentMode}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${txn.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                                {txn.type === 'CREDIT' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-blue-600">
                                                {txn.profit > 0 ? `+₹${txn.profit.toLocaleString()}` : txn.profit < 0 ? `-₹${Math.abs(txn.profit).toLocaleString()}` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="px-4 py-12 text-center text-muted-foreground">
                                                No transactions found for the selected period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Custom Context Menu */}
                        {contextMenu.visible && (
                            <div
                                className="fixed z-50 bg-popover border rounded-xl shadow-xl py-2 w-48 animate-in fade-in zoom-in-95 duration-200"
                                style={{ top: contextMenu.y, left: contextMenu.x }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b mb-1">
                                    Link to Card
                                </div>
                                {cards.map(card => (
                                    <button
                                        key={card.id}
                                        onClick={() => handleLinkToCard(contextMenu.txnId, card.id)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                                    >
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }}></div>
                                        <span className="font-medium">{card.name}</span>
                                    </button>
                                ))}
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start rounded-none h-auto py-2 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-semibold"
                                    onClick={() => handleLinkToCard(contextMenu.txnId, null)}
                                >
                                    <RotateCcw className="w-3 h-3 mr-2" />
                                    Unlink Card
                                </Button>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 pb-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Previous
                                </Button>
                                <div className="flex items-center px-4 text-sm text-muted-foreground font-medium">
                                    Page {page + 1} of {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === totalPages - 1}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <SimpleAlert
                open={alertConfig.isOpen}
                onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, isOpen: open }))}
                title={alertConfig.title}
                description={alertConfig.message}
            />
        </div>
    );
}
