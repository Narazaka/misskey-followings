import { Container } from "@mantine/core";
import ApiKeys from "./components/ApiKeys";
import type { AppStore } from "src/preload/AppStore";
import { useState } from "react";
import Followings from "./components/Followings";

function App(): JSX.Element {
  const [keys, setKeys] = useState<AppStore["keys"]>([]);
  return (
    <Container maw="100%">
      <ApiKeys keys={keys} setKeys={setKeys} />
      <Followings keys={keys} />
    </Container>
  );
}

export default App;
