-- Enforce per-user upload quota in Storage: 20 MB total in decks bucket.

drop policy if exists "Authenticated users can upload to own folder" on storage.objects;

create policy "Authenticated users can upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'decks'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      coalesce((
        select sum(
          case
            when coalesce(o.metadata->>'size', '') ~ '^[0-9]+$'
              then (o.metadata->>'size')::bigint
            else 0
          end
        )
        from storage.objects o
        where o.bucket_id = 'decks'
          and (storage.foldername(o.name))[1] = auth.uid()::text
      ), 0)
      +
      case
        when coalesce(metadata->>'size', '') ~ '^[0-9]+$'
          then (metadata->>'size')::bigint
        else 0
      end
      <= 20 * 1024 * 1024
    )
  );

