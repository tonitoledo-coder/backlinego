import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, Upload, X, ArrowLeft, Wrench, CheckCircle, 
  Clock, Loader2, Image as ImageIcon, Euro, Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

function MessageBubble({ msg, isMine }) {
  return (
    <div className={cn("flex gap-2 mb-4", isMine ? "justify-end" : "justify-start")}>
      {!isMine && (
        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
          <Wrench className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={cn("max-w-[78%] space-y-1")}>
        {/* Photos */}
        {msg.photos?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-1">
            {msg.photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="" className="w-24 h-24 object-cover rounded-xl border border-zinc-700 hover:opacity-80 transition" />
              </a>
            ))}
          </div>
        )}

        {/* Quote offer bubble */}
        {msg.type === 'quote_offer' ? (
          <div className={cn("rounded-2xl p-4 border", isMine 
            ? "bg-blue-600/20 border-blue-500/40 rounded-tr-sm" 
            : "bg-purple-600/20 border-purple-500/40 rounded-tl-sm")}>
            <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wide font-semibold">Presupuesto ofrecido</p>
            <p className="text-2xl font-bold text-white mb-1">€{msg.quote_amount}</p>
            {msg.content && <p className="text-sm text-zinc-300">{msg.content}</p>}
          </div>
        ) : msg.type === 'system' ? (
          <div className="text-center">
            <span className="text-xs text-zinc-500 bg-zinc-800/60 px-3 py-1 rounded-full">{msg.content}</span>
          </div>
        ) : msg.content ? (
          <div className={cn("px-4 py-2.5 rounded-2xl text-sm leading-relaxed", isMine
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-zinc-800 text-zinc-100 rounded-tl-sm")}>
            {msg.content}
          </div>
        ) : null}

        <p className={cn("text-[10px] text-zinc-600", isMine ? "text-right" : "text-left")}>
          {msg.sender_name} · {new Date(msg.created_date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default function Chat() {
  const params = new URLSearchParams(window.location.search);
  const quoteId = params.get('id');

  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [showQuoteOffer, setShowQuoteOffer] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  // Fetch quote request
  const { data: quoteRequests = [] } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => base44.entities.QuoteRequest.filter({ id: quoteId }),
    enabled: !!quoteId,
  });
  const quote = quoteRequests[0];

  // Fetch messages with polling
  const { data: messages = [] } = useQuery({
    queryKey: ['chat', quoteId],
    queryFn: () => base44.entities.ChatMessage.filter({ quote_request_id: quoteId }, 'created_date', 200),
    enabled: !!quoteId,
    refetchInterval: 3000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!quoteId) return;
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.quote_request_id === quoteId) {
        queryClient.invalidateQueries({ queryKey: ['chat', quoteId] });
      }
    });
    return unsub;
  }, [quoteId, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (msgData) => base44.entities.ChatMessage.create(msgData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', quoteId] }),
  });

  const handleSend = async () => {
    if (!text.trim() && pendingPhotos.length === 0) return;
    await sendMutation.mutateAsync({
      quote_request_id: quoteId,
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      sender_role: user.email === quote?.specialist_email ? 'specialist' : 'user',
      content: text.trim(),
      photos: pendingPhotos,
      type: pendingPhotos.length > 0 && !text.trim() ? 'photo' : 'text',
    });
    setText('');
    setPendingPhotos([]);
  };

  const handleSendQuoteOffer = async () => {
    if (!quoteAmount) return;
    await sendMutation.mutateAsync({
      quote_request_id: quoteId,
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      sender_role: 'specialist',
      content: text.trim() || `Presupuesto para reparación de ${quote?.equipment_type}`,
      photos: [],
      type: 'quote_offer',
      quote_amount: parseFloat(quoteAmount),
    });
    // Update quote status
    await base44.entities.QuoteRequest.update(quoteId, { status: 'quoted', quote_amount: parseFloat(quoteAmount) });
    queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
    setShowQuoteOffer(false);
    setQuoteAmount('');
    setText('');
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    setPendingPhotos(prev => [...prev, ...urls].slice(0, 5));
    setUploading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isSpecialist = user && quote && user.email === quote.specialist_email;

  if (!quoteId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Wrench className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">No se especificó un chat</p>
          <Link to={createPageUrl('Specialists')}>
            <Button className="mt-4">Ver Técnicos</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusColors = { pending: 'text-yellow-400', viewed: 'text-blue-400', quoted: 'text-purple-400', accepted: 'text-green-400', rejected: 'text-red-400' };
  const statusLabels = { pending: 'Pendiente', viewed: 'Visto', quoted: 'Presupuestado', accepted: 'Aceptado', rejected: 'Rechazado' };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-4rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 flex-shrink-0">
        <Link to={createPageUrl('Specialists')}>
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{quote?.specialist_name || '...'}</p>
          <div className="flex items-center gap-2">
            {quote?.equipment_type && (
              <span className="text-xs text-zinc-400 truncate">{quote.equipment_type}</span>
            )}
            {quote?.status && (
              <Badge className={cn("text-[10px] px-1.5 py-0 h-4", statusColors[quote.status])}>
                {statusLabels[quote.status]}
              </Badge>
            )}
          </div>
        </div>
        {quote?.requester_phone && isSpecialist && (
          <a href={`tel:${quote.requester_phone}`}>
            <Button variant="ghost" size="icon" className="text-green-400">
              <Phone className="w-5 h-5" />
            </Button>
          </a>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Initial request context */}
        {quote && (
          <div className="bg-zinc-800/60 rounded-2xl p-4 mb-4 border border-zinc-700">
            <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide mb-2">Solicitud de presupuesto</p>
            <p className="text-sm text-zinc-300 mb-2">{quote.description}</p>
            {quote.photos?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {quote.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-zinc-600" />
                  </a>
                ))}
              </div>
            )}
            {quote.urgency === 'urgente' && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 mt-2">⚡ Urgente</Badge>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMine={user && msg.sender_email === user.email}
          />
        ))}

        {messages.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">Esperando respuesta del especialista...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quote Offer Panel (specialist only) */}
      {isSpecialist && showQuoteOffer && (
        <div className="px-4 pb-2 bg-zinc-900 border-t border-zinc-800 pt-3 flex-shrink-0">
          <p className="text-xs text-zinc-400 mb-2 font-semibold uppercase">Enviar presupuesto</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="number"
                placeholder="Importe €"
                value={quoteAmount}
                onChange={e => setQuoteAmount(e.target.value)}
                className="pl-9 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <Input
              placeholder="Nota opcional..."
              value={text}
              onChange={e => setText(e.target.value)}
              className="flex-[2] bg-zinc-800 border-zinc-700 text-white"
            />
            <Button onClick={handleSendQuoteOffer} className="bg-purple-600 hover:bg-purple-700" disabled={!quoteAmount}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Pending photos preview */}
      {pendingPhotos.length > 0 && (
        <div className="flex gap-2 px-4 py-2 bg-zinc-900 border-t border-zinc-800 overflow-x-auto flex-shrink-0">
          {pendingPhotos.map((url, i) => (
            <div key={i} className="relative flex-shrink-0">
              <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg" />
              <button
                onClick={() => setPendingPhotos(p => p.filter((_, idx) => idx !== i))}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="px-4 py-3 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Photo upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center flex-shrink-0 transition-colors"
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" /> : <ImageIcon className="w-5 h-5 text-zinc-400" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />

          {/* Specialist: quote offer button */}
          {isSpecialist && (
            <button
              type="button"
              onClick={() => setShowQuoteOffer(p => !p)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                showQuoteOffer ? "bg-purple-600" : "bg-zinc-800 hover:bg-zinc-700"
              )}
            >
              <Euro className="w-5 h-5 text-white" />
            </button>
          )}

          <Input
            placeholder="Escribe un mensaje..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-500 rounded-full px-4"
          />

          <Button
            onClick={handleSend}
            disabled={(!text.trim() && pendingPhotos.length === 0) || sendMutation.isPending}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 p-0 flex-shrink-0"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}