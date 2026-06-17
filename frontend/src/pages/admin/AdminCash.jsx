import { useEffect, useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminCash() {
  const [activeSubTab, setActiveSubTab] = useState('tpv')
  const [products, setProducts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const [isClosed, setIsClosed] = useState(false)
  const [closingInfo, setClosingInfo] = useState(null)
  const [closingLoading, setClosingLoading] = useState(false)

  // State del TPV / Carrito
  const [cart, setCart] = useState([])
  const [tpvPaymentMethod, setTpvPaymentMethod] = useState('cash')
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // State del Inventario / Restock Modal
  const [selectedRestockProduct, setSelectedRestockProduct] = useState(null)
  const [restockQty, setRestockQty] = useState(10)
  const [restockExpense, setRestockExpense] = useState(true)
  const [restockPaymentMethod, setRestockPaymentMethod] = useState('cash')
  const [restockLoading, setRestockLoading] = useState(false)

  // State del Nuevo Producto Modal
  const [showNewProductModal, setShowNewProductModal] = useState(false)
  const [newProductForm, setNewProductForm] = useState({ name: '', price: '', stock: '' })
  const [newProductLoading, setNewProductLoading] = useState(false)

  // State de Egresos Manuales
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', paymentMethod: 'cash' })
  const [expenseLoading, setExpenseLoading] = useState(false)

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/cash/products')
      setProducts(data.products || [])
    } catch { toast.error('Error al cargar catálogo') }
  }

  const fetchTransactionsAndSummary = async () => {
    setLoading(true)
    try {
      const [tRes, sRes] = await Promise.all([
        api.get(`/cash/transactions?date=${selectedDate}`),
        api.get(`/cash/summary?date=${selectedDate}`),
      ])
      setTransactions(tRes.data.transactions || [])
      setSummary(sRes.data.summary || null)
      setIsClosed(sRes.data.isClosed || false)
      setClosingInfo(sRes.data.closingInfo || null)
    } catch { toast.error('Error al cargar arqueo de caja') }
    finally { setLoading(false) }
  }

  const handleCloseCash = async () => {
    if (!confirm(`¿Estás seguro de que deseas realizar el cierre de caja para el día ${selectedDate}?\n\nEsta acción BLOQUEARÁ todos los valores y no se podrán realizar más cobros, ventas ni egresos para esta fecha.`)) {
      return
    }
    setClosingLoading(true)
    try {
      await api.post('/cash/close', { date: selectedDate })
      toast.success('Caja cerrada con éxito 🔒')
      await fetchTransactionsAndSummary()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cerrar la caja')
    } finally {
      setClosingLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    fetchTransactionsAndSummary()
  }, [selectedDate])

  // TPV: Añadir al carrito
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id)
    const currentQtyInCart = existing ? existing.quantity : 0

    if (currentQtyInCart >= product.stock) {
      toast.error('No hay suficiente stock disponible')
      return
    }

    if (existing) {
      setCart(prev => prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
    } else {
      setCart(prev => [...prev, { ...product, quantity: 1 }])
    }
  }

  // TPV: Quitar / Decrementar del carrito
  const removeFromCart = (productId) => {
    const existing = cart.find(item => item.id === productId)
    if (existing.quantity > 1) {
      setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
    } else {
      setCart(prev => prev.filter(item => item.id !== productId))
    }
  }

  // TPV: Limpiar carrito
  const clearCart = () => setCart([])

  // TPV: Cobrar Carrito
  const handleCheckout = async (e) => {
    e.preventDefault()
    if (cart.length === 0) return
    setCheckoutLoading(true)

    try {
      const itemsPayload = cart.map(item => ({ id: item.id, quantity: item.quantity }))
      await api.post('/cash/transactions', {
        type: 'income_product',
        payment_method: tpvPaymentMethod,
        items: itemsPayload,
      })
      toast.success('Venta registrada con éxito 🥤')
      clearCart()
      await fetchProducts()
      await fetchTransactionsAndSummary()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al procesar la venta')
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Inventario: Restock
  const handleRestockSubmit = async (e) => {
    e.preventDefault()
    if (!selectedRestockProduct) return
    setRestockLoading(true)

    try {
      await api.post(`/cash/products/${selectedRestockProduct.id}/restock`, {
        quantity: restockQty,
        record_expense: isClosed ? false : restockExpense,
        payment_method: restockPaymentMethod,
      })
      toast.success('Stock reabastecido correctamente')
      setSelectedRestockProduct(null)
      await fetchProducts()
      await fetchTransactionsAndSummary()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al reabastecer stock')
    } finally {
      setRestockLoading(false)
    }
  }

  // Inventario: Crear Producto
  const handleNewProductSubmit = async (e) => {
    e.preventDefault()
    if (!newProductForm.name || !newProductForm.price) return
    setNewProductLoading(true)

    try {
      await api.post('/cash/products', {
        name: newProductForm.name,
        price: parseFloat(newProductForm.price),
        stock: parseInt(newProductForm.stock) || 0,
      })
      toast.success('Producto añadido correctamente al inventario 📦')
      setShowNewProductModal(false)
      setNewProductForm({ name: '', price: '', stock: '' })
      await fetchProducts()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al añadir producto')
    } finally {
      setNewProductLoading(false)
    }
  }

  // Egresos: Registrar Egreso
  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    if (!expenseForm.amount || !expenseForm.description) return
    setExpenseLoading(true)

    try {
      await api.post('/cash/transactions', {
        type: 'expense',
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        payment_method: expenseForm.paymentMethod,
      })
      toast.success('Gasto de caja registrado 💸')
      setExpenseForm({ amount: '', description: '', paymentMethod: 'cash' })
      await fetchTransactionsAndSummary()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar egreso')
    } finally {
      setExpenseLoading(false)
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <div className="pt-2 pb-6">
      {/* Sub Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-800/40 p-1 rounded-xl max-w-fit border border-slate-700/30">
        {[
          { id: 'tpv', label: '🛒 TPV / Cafetería' },
          { id: 'inventory', label: '📦 Inventario' },
          { id: 'expense', label: '💸 Egreso de Caja' },
          { id: 'arqueo', label: '📊 Arqueo y Cierre' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeSubTab === tab.id
                ? 'bg-brand-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TABS CONTENT ────────────────────────────────────────────────── */}

      {/* TPV / Cafetería */}
      {activeSubTab === 'tpv' && (
        <div className="space-y-4">
          {isClosed && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
              <span className="text-xl">🔒</span>
              <div>
                <div className="font-semibold text-sm">Caja Cerrada</div>
                <div className="text-xs text-red-400/80">
                  La caja para este día está cerrada. No se admiten más ventas ni movimientos.
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Grid de Productos */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.map(prod => {
                  const cartItem = cart.find(c => c.id === prod.id)
                  const availableStock = prod.stock - (cartItem?.quantity || 0)
                  const isOut = prod.stock === 0
                  const isLimit = availableStock === 0

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isClosed && !isLimit && !isOut && addToCart(prod)}
                      className={`card-hover p-4 text-center relative transition-all ${
                        isOut
                          ? 'opacity-50 border-red-500/20 bg-red-950/5 cursor-not-allowed'
                          : isLimit
                          ? 'border-yellow-500/20 bg-yellow-950/5 cursor-not-allowed'
                          : isClosed
                          ? 'opacity-50 border-slate-700/30 bg-slate-900/10 cursor-not-allowed'
                          : 'border-slate-700/30 hover:border-brand-500/30 cursor-pointer'
                      }`}
                    >
                      <div className="text-3xl mb-2">
                        {prod.name.includes('Coca') ? '🥤' : prod.name.includes('Agua') ? '💧' : prod.name.includes('Cerveza') ? '🍺' : '🎾'}
                      </div>
                      <h4 className="font-bold text-sm text-slate-200 truncate">{prod.name}</h4>
                      <div className="text-brand-400 font-bold mt-1 text-base">
                        ${parseFloat(prod.price).toFixed(2)}
                      </div>
                      <div className={`text-xs mt-2 font-medium ${prod.stock <= 5 ? 'text-red-400' : 'text-slate-500'}`}>
                        {prod.stock === 0 ? 'Agotado' : `Stock: ${prod.stock} uds`}
                      </div>
                      {cartItem && (
                        <div className="absolute top-2 right-2 bg-brand-500 text-slate-900 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-scale-up">
                          {cartItem.quantity}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Carrito POS */}
            <div className="lg:col-span-1">
              <div className="card border border-slate-700/50 flex flex-col justify-between min-h-[400px]">
                <div>
                  <h3 className="font-semibold text-slate-200 mb-4 flex justify-between items-center text-sm uppercase tracking-wider">
                    <span>🛒 Resumen de Compra</span>
                    {cart.length > 0 && (
                      <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300 font-medium">
                        Limpiar
                      </button>
                    )}
                  </h3>

                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">
                      El carrito está vacío. Haz clic en los productos para agregarlos.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-700/30 last:border-0">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-300 truncate">{item.name}</div>
                            <div className="text-slate-500 mt-0.5">${parseFloat(item.price).toFixed(2)} x {item.quantity}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-5 h-5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-bold text-white text-xs">{item.quantity}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-5 h-5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <form onSubmit={handleCheckout} className="pt-4 border-t border-slate-700/30 mt-4 space-y-4">
                    <div className="flex justify-between items-center text-slate-300 font-semibold text-sm">
                      <span>Total de Venta:</span>
                      <span className="text-brand-400 font-display font-black text-lg">
                        ${cartTotal.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <label className="label text-[10px] uppercase tracking-wider text-slate-500">Método de Pago</label>
                      <select
                        value={tpvPaymentMethod}
                        onChange={e => setTpvPaymentMethod(e.target.value)}
                        className="input text-xs"
                      >
                        <option value="cash">💵 Efectivo (Cash)</option>
                        <option value="card">💳 Tarjeta (Card)</option>
                        <option value="transfer">🏦 Transferencia</option>
                      </select>
                    </div>

                    <button type="submit" disabled={checkoutLoading || isClosed} className="btn-primary w-full text-xs">
                      {checkoutLoading ? 'Procesando...' : isClosed ? '🔒 Caja Cerrada' : 'Confirmar Venta y Cobrar'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventario */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider">📦 Control de Existencias</h3>
              <button
                type="button"
                onClick={() => setShowNewProductModal(true)}
                className="btn-primary py-1.5 px-4 text-xs font-bold w-full sm:w-auto"
              >
                + Añadir Producto
              </button>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio Venta</th>
                    <th>Stock Actual</th>
                    <th>Estado Stock</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(prod => (
                    <tr key={prod.id}>
                      <td className="font-semibold text-slate-200">{prod.name}</td>
                      <td>${parseFloat(prod.price).toFixed(2)}</td>
                      <td className="font-bold text-slate-300">{prod.stock} uds</td>
                      <td>
                        {prod.stock === 0 ? (
                          <span className="badge badge-red">Agotado</span>
                        ) : prod.stock <= 5 ? (
                          <span className="badge badge-yellow">Stock Crítico</span>
                        ) : (
                          <span className="badge badge-green">Saludable</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => setSelectedRestockProduct(prod)}
                          className="btn-outline py-1 px-3 text-xs"
                        >
                          ➕ Reabastecer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal de Reabastecimiento */}
          {selectedRestockProduct && (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
              <div className="card w-full max-w-md border border-slate-700/50">
                <h3 className="font-bold text-lg text-white mb-4">Reabastecer: {selectedRestockProduct.name}</h3>
                <form onSubmit={handleRestockSubmit} className="space-y-4">
                  <div>
                    <label className="label text-xs">Cantidad a Añadir</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={restockQty}
                      onChange={e => setRestockQty(parseInt(e.target.value))}
                      className="input text-sm"
                    />
                  </div>

                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="recordExpense"
                        checked={isClosed ? false : restockExpense}
                        disabled={isClosed}
                        onChange={e => setRestockExpense(e.target.checked)}
                        className="w-4 h-4 accent-brand-500 disabled:opacity-50"
                      />
                      <label htmlFor="recordExpense" className={`text-xs ${isClosed ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 cursor-pointer'}`}>
                        Registrar costo como egreso de caja {isClosed && '(Bloqueado: Caja Cerrada)'}
                      </label>
                    </div>

                    {!isClosed && restockExpense && (
                      <>
                        <div className="text-[10px] text-slate-500">
                          Se calculará un costo de compra estimado del 50% del precio de venta (${ (selectedRestockProduct.price * 0.5 * restockQty).toFixed(2) } totales).
                        </div>
                        <div>
                          <label className="label text-[10px] uppercase text-slate-500">Origen de Fondos</label>
                          <select
                            value={restockPaymentMethod}
                            onChange={e => setRestockPaymentMethod(e.target.value)}
                            className="input text-xs"
                          >
                            <option value="cash">💵 Caja (Efectivo)</option>
                            <option value="card">💳 Cuenta Banco (Tarjeta)</option>
                            <option value="transfer">🏦 Transferencia</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" disabled={restockLoading} className="btn-primary w-full text-xs">
                      {restockLoading ? 'Reabasteciendo...' : 'Confirmar Reabasto'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRestockProduct(null)}
                      className="btn-secondary w-full text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Modal de Añadir Nuevo Producto */}
          {showNewProductModal && (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="card w-full max-w-md border border-slate-700/50">
                <h3 className="font-bold text-lg text-white mb-4">➕ Añadir Nuevo Producto</h3>
                <form onSubmit={handleNewProductSubmit} className="space-y-4">
                  <div>
                    <label className="label text-xs">Nombre del Producto *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Gatorade Manzana 500ml"
                      value={newProductForm.name}
                      onChange={e => setNewProductForm(p => ({ ...p, name: e.target.value }))}
                      className="input text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Precio Venta ($) *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newProductForm.price}
                        onChange={e => setNewProductForm(p => ({ ...p, price: e.target.value }))}
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Stock Inicial</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newProductForm.stock}
                        onChange={e => setNewProductForm(p => ({ ...p, stock: e.target.value }))}
                        className="input text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={newProductLoading} className="btn-primary w-full text-xs">
                      {newProductLoading ? 'Guardando...' : 'Añadir Producto'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewProductModal(false);
                        setNewProductForm({ name: '', price: '', stock: '' });
                      }}
                      className="btn-secondary w-full text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Egreso de Caja */}
      {activeSubTab === 'expense' && (
        <div className="max-w-xl space-y-4">
          {isClosed && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
              <span className="text-xl">🔒</span>
              <div>
                <div className="font-semibold text-sm">Caja Cerrada</div>
                <div className="text-xs text-red-400/80">
                  La caja para este día está cerrada. No se admiten egresos manuales.
                </div>
              </div>
            </div>
          )}
          <div className="card border border-red-500/20">
            <h3 className="font-semibold text-red-400 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
              <span>💸 Registrar Egreso Manual</span>
            </h3>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="label text-xs">Concepto / Descripción del Gasto *</label>
                <input
                  type="text"
                  required
                  disabled={isClosed}
                  placeholder="Ej: Pago de hielo, Reparación de red, Limpieza"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                  className="input text-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="label text-xs">Monto Egreso ($) *</label>
                <input
                  type="number"
                  required
                  disabled={isClosed}
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
                  className="input text-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="label text-xs">Método de Pago Utilizado *</label>
                <select
                  value={expenseForm.paymentMethod}
                  disabled={isClosed}
                  onChange={e => setExpenseForm(p => ({ ...p, paymentMethod: e.target.value }))}
                  className="input text-sm disabled:opacity-50"
                >
                  <option value="cash">💵 Efectivo (Caja)</option>
                  <option value="card">💳 Tarjeta (Banco)</option>
                  <option value="transfer">🏦 Transferencia</option>
                </select>
              </div>

              <button type="submit" disabled={expenseLoading || isClosed} className="btn-primary w-full bg-red-600 hover:bg-red-500 border-red-700/50 disabled:opacity-50">
                {expenseLoading ? 'Registrando egreso...' : isClosed ? '🔒 Caja Cerrada' : 'Registrar Gasto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Arqueo y Cierre */}
      {activeSubTab === 'arqueo' && (
        <div className="space-y-6">
          {/* Cabecera de fecha */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider">📊 Cierre y Arqueo Diario</h3>
              <p className="text-xs text-slate-500">Muestra los arqueos diferenciados de ingresos y egresos.</p>
            </div>
            <div>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="input text-xs max-w-xs"
              />
            </div>
          </div>

          {summary && (
            <>
              {/* Cierre de Caja Banner o Botón */}
              <div className="animate-scale-up">
                {isClosed ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔒</span>
                      <div>
                        <div className="font-semibold text-sm">Cierre de Caja Completado</div>
                        <div className="text-xs text-emerald-400/80">Esta caja ha sido cerrada y los valores están guardados de forma inmutable.</div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>Cerrado por: <strong>{closingInfo?.closedBy?.name || 'Administrador'}</strong></div>
                      <div>Fecha: {new Date(closingInfo?.closed_at).toLocaleDateString('es-ES')} a las {new Date(closingInfo?.closed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-sm text-slate-200">Cierre de Caja Diario</div>
                      <p className="text-xs text-slate-500 mt-1">Una vez realizado el cierre, no se podrán registrar más ventas, egresos ni cobros de pistas para este día.</p>
                    </div>
                    <button
                      onClick={handleCloseCash}
                      disabled={closingLoading}
                      className="btn-primary bg-red-600 hover:bg-red-500 border-red-700/50 text-xs py-2.5 px-4 font-bold tracking-wider flex items-center gap-1.5"
                    >
                      🔒 {closingLoading ? 'Cerrando caja...' : 'Cerrar Caja (Bloquear Valores)'}
                    </button>
                  </div>
                )}
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Ingresos Pistas', value: summary.courtIncome, sub: 'Reservas cobradas', color: 'text-blue-400', icon: '🎾' },
                  { label: 'Ingresos Cafetería', value: summary.productIncome, sub: 'Ventas TPV', color: 'text-emerald-400', icon: '🥤' },
                  { label: 'Gastos / Egresos', value: summary.expenses, sub: 'Egresos registrados', color: 'text-red-400', icon: '💸' },
                  { label: 'Balance Caja Neto', value: summary.netBalance, sub: 'Ingresos - Egresos', color: summary.netBalance >= 0 ? 'text-brand-400' : 'text-red-400', icon: '💰' },
                ].map(stat => (
                  <div key={stat.label} className="card p-4 flex items-center justify-between border-slate-700/30">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{stat.label}</div>
                      <div className={`font-display font-black text-2xl mt-1 ${stat.color}`}>
                        ${parseFloat(stat.value).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">{stat.sub}</div>
                    </div>
                    <div className="text-3xl opacity-80">{stat.icon}</div>
                  </div>
                ))}
              </div>

              {/* Doblado por Métodos de Pago */}
              <div className="card">
                <h4 className="text-slate-300 font-semibold mb-3 text-xs uppercase tracking-wider">
                  📂 Desglose por origen de fondos (Neto)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Efectivo en Caja', val: summary.methodBreakdown.cash, color: 'text-emerald-400', desc: 'Suma en caja física' },
                    { label: 'Terminal Tarjeta', val: summary.methodBreakdown.card, color: 'text-blue-400', desc: 'Ingresos POS Banco' },
                    { label: 'Transferencias', val: summary.methodBreakdown.transfer, color: 'text-purple-400', desc: 'Transferencias directas' },
                  ].map(m => (
                    <div key={m.label} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
                      <div className="text-xs font-semibold text-slate-400">{m.label}</div>
                      <div className={`text-xl font-black font-mono mt-1 ${m.color}`}>
                        ${parseFloat(m.val).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Listado de movimientos de caja */}
          <div className="card">
            <h4 className="text-slate-300 font-semibold mb-4 text-sm uppercase tracking-wider">
              📜 Libro Diario / Movimientos ({transactions.length})
            </h4>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No hay transacciones registradas para esta fecha.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table text-xs">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Descripción / Movimiento</th>
                      <th>Método</th>
                      <th className="text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => {
                      const isExpense = t.type === 'expense'
                      return (
                        <tr key={t.id} className={isExpense ? 'bg-red-500/5' : ''}>
                          <td className="font-semibold capitalize">
                            {t.type === 'income_court' ? (
                              <span className="text-blue-400 flex items-center gap-1">🎾 Cancha</span>
                            ) : t.type === 'income_product' ? (
                              <span className="text-emerald-400 flex items-center gap-1">🥤 Cafetería</span>
                            ) : (
                              <span className="text-red-400 flex items-center gap-1">💸 Gasto</span>
                            )}
                          </td>
                          <td className="text-slate-200 font-medium">
                            {t.description}
                          </td>
                          <td className="uppercase text-slate-400 font-mono text-[10px]">
                            {t.payment_method}
                          </td>
                          <td className={`text-right font-bold font-mono text-sm ${isExpense ? 'text-red-400' : 'text-emerald-400'}`}>
                            {isExpense ? '-' : '+'}${parseFloat(t.amount).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
