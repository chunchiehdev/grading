[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/chunchiehdev/grading)


## Check the cluster first


### Update the database schema
```bash
kubectl exec -it deployment/gradsystem-dev -n gradsystem-dev -- npx prisma migrate deploy
```

### Ensure an admin user exists,
```bash
kubectl exec -it deployment/gradsystem-dev -n gradsystem-dev -- npm run seed:admin
```

### Restart the application
```bash
kubectl rollout restart deployment gradsystem-dev -n gradsystem-dev
```