
import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { User } from '../../types';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    profilePic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ariel'
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const user = authService.login(formData.username, formData.password);
      if (user) onAuthSuccess(user);
      else setError('Credenciais inválidas ou alma não encontrada.');
    } else {
      if (!formData.username || !formData.password || !formData.email) {
        setError('Preencha todos os pergaminhos.');
        return;
      }
      const success = authService.register({
        username: formData.username,
        email: formData.email,
        profilePic: formData.profilePic
      }, formData.password);
      
      if (success) {
        setIsLogin(true);
        setError('Registro concluído. Agora, identifique-se.');
      } else {
        setError('Este nome já foi clamado por outra alma.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 scale-110 animate-pulse"></div>
      
      <div className="w-full max-w-md bg-zinc-950/80 border border-amber-900/40 p-10 shadow-[0_0_80px_rgba(0,0,0,1)] relative z-10 backdrop-blur-md animate-fade-in">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-cinzel text-amber-600 mb-2 uppercase tracking-[0.2em]">
            {isLogin ? 'Retorno da Alma' : 'Nova Penitência'}
          </h2>
          <div className="w-16 h-px bg-amber-900 mx-auto opacity-30"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="group">
            <label className="block text-[10px] font-medieval text-zinc-500 uppercase mb-2 tracking-widest group-focus-within:text-amber-700 transition-colors">Identidade</label>
            <input 
              type="text" 
              placeholder="Nome de Usuário"
              className="w-full bg-zinc-900/50 border border-zinc-800 p-3 text-zinc-300 font-spectral focus:border-amber-700 outline-none transition-all placeholder:text-zinc-700"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>

          {!isLogin && (
            <>
              <div className="group">
                <label className="block text-[10px] font-medieval text-zinc-500 uppercase mb-2 tracking-widest group-focus-within:text-amber-700 transition-colors">Vínculo Sagrado</label>
                <input 
                  type="email" 
                  placeholder="seu@email.com"
                  className="w-full bg-zinc-900/50 border border-zinc-800 p-3 text-zinc-300 font-spectral focus:border-amber-700 outline-none transition-all placeholder:text-zinc-700"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-medieval text-zinc-500 uppercase mb-2 tracking-widest group-focus-within:text-amber-700 transition-colors">Efígie Visual (URL)</label>
                <input 
                  type="text" 
                  placeholder="https://imagem-de-perfil.png"
                  className="w-full bg-zinc-900/50 border border-zinc-800 p-3 text-zinc-300 font-spectral focus:border-amber-700 outline-none transition-all placeholder:text-zinc-700 text-xs"
                  value={formData.profilePic}
                  onChange={e => setFormData({...formData, profilePic: e.target.value})}
                />
              </div>
            </>
          )}

          <div className="group">
            <label className="block text-[10px] font-medieval text-zinc-500 uppercase mb-2 tracking-widest group-focus-within:text-amber-700 transition-colors">Chave do Destino</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full bg-zinc-900/50 border border-zinc-800 p-3 text-zinc-300 font-spectral focus:border-amber-700 outline-none transition-all placeholder:text-zinc-700"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {error && <p className="text-red-900 font-medieval text-xs text-center p-2 bg-red-950/20 border border-red-900/30 animate-pulse">{error}</p>}

          <button className="w-full py-5 bg-amber-950/20 border border-amber-900/50 text-amber-600 font-cinzel text-lg hover:bg-amber-600 hover:text-black transition-all duration-500 tracking-[0.3em] uppercase shadow-lg">
            {isLogin ? 'Despertar' : 'Surgir'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-zinc-600 font-medieval text-[10px] uppercase hover:text-amber-700 transition-colors tracking-[0.2em] border-b border-transparent hover:border-amber-900/50 pb-1"
          >
            {isLogin ? 'Deseja iniciar uma nova penitência?' : 'Já possui um fardo registrado? Entre'}
          </button>
        </div>
      </div>
    </div>
  );
};
