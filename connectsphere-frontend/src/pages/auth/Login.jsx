import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiError, apiFieldErrors } from '../../lib/api';
import AuthShell from '../../components/layout/AuthShell.jsx';
import { Input } from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await login(form.email.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setErrors(apiFieldErrors(err));
      toast(apiError(err, 'Could not sign you in'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="font-display text-2xl font-bold text-ink dark:text-white">Welcome back</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Sign in to pick up where you left off.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={onChange}
          error={errors.email}
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={form.password}
          onChange={onChange}
          error={errors.password}
          required
        />
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        New to ConnectSphere?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
