-- Defense in depth only. A session GUC or pasted preview ref is not
-- database identity. Refuse only if an operator explicitly labeled the
-- session as production.
do $$
begin
  if current_setting('r2.sql_editor.preview_ref', true) = 'iwoaaljitifloolszxlu' then
    raise exception 'Refusing production project';
  end if;
end $$;
